// Lit le programme TV, garde les matchs de football à diffusion confirmée, écrit data/matches.json.
import { readFileSync, writeFileSync } from "node:fs";
import { unzipSync, gunzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { detectCompetition, isLiveFootballMatch, parseTeams, parseXmltvDate } from "./tv.mjs";

const URL_TV = process.env.XMLTV_URL || "https://xmltvfr.fr/xmltv/xmltv.zip";
const OUT = "data/matches.json";
const txt = (v) => (Array.isArray(v) ? txt(v[0]) : typeof v === "object" && v ? txt(v["#text"]) : String(v ?? ""));

async function download() {
  const res = await fetch(URL_TV);
  if (!res.ok) throw new Error(`Programme TV inaccessible (${res.status})`);
  let b = new Uint8Array(await res.arrayBuffer());
  if (b[0] === 0x50 && b[1] === 0x4b) {
    const files = unzipSync(b);
    const name = Object.keys(files).find((n) => n.toLowerCase().endsWith(".xml"));
    if (!name) throw new Error("Aucun fichier .xml dans l'archive");
    b = files[name];
  } else if (b[0] === 0x1f && b[1] === 0x8b) b = gunzipSync(b);
  return new TextDecoder("utf-8").decode(b);
}

let previous = { matches: [] };
try { previous = JSON.parse(readFileSync(OUT, "utf8")); } catch {}
const oldAnalyses = new Map(previous.matches.filter((m) => m.analysis).map((m) => [m.id, m.analysis]));

const tv = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" }).parse(await download()).tv;
const channels = new Map([].concat(tv?.channel ?? []).map((c) => [c["@id"], txt(c["display-name"])]));
// Garde-fou : un fichier vide ou illisible ne doit jamais effacer les données existantes.
if (channels.size === 0) throw new Error("Programme TV vide ou illisible : abandon sans modification.");

const from = new Date(Date.now() - 3 * 3600e3).toISOString();
const to = new Date(Date.now() + 8 * 86400e3).toISOString();
const sourceName = new URL(URL_TV).hostname;
const found = new Map();
for (const p of [].concat(tv?.programme ?? [])) {
  const start = parseXmltvDate(p["@start"] ?? "");
  if (!start || start < from || start > to) continue;
  const title = txt(p.title), desc = txt(p.desc), cat = txt(p.category);
  const channel = channels.get(p["@channel"]);
  const teams = parseTeams(title);
  if (!channel || !teams || !isLiveFootballMatch(title, desc, cat)) continue; // exclu si non vérifiable
  const id = `${channel}|${start}|${teams.home}|${teams.away}`;
  found.set(id, { id, ...teams, channel, start, competition: detectCompetition(`${title} ${desc} ${cat}`),
    source_name: sourceName, source_url: URL_TV, analysis: oldAnalyses.get(id) });
}
const matches = [...found.values()].sort((a, b) => a.start.localeCompare(b.start));

// Analyses (optionnel) pour les matchs des 36 prochaines heures.
const key = process.env.ANTHROPIC_API_KEY;
if (key) {
  const soon = new Date(Date.now() + 36 * 3600e3).toISOString();
  for (const m of matches.filter((m) => !m.analysis && m.start <= soon).slice(0, 30)) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 500, messages: [{ role: "user", content:
          `Match : ${m.home} - ${m.away} (${m.competition ?? "football"}). Rédige en français une analyse courte (6 lignes max) puis un pronostic (1, N ou 2) avec un niveau de confiance. Base-toi uniquement sur ce que tu sais de façon fiable sur ces équipes ; n'invente aucune statistique, blessure ou composition ; signale l'incertitude. Rappelle qu'un pronostic n'est pas une certitude.` }] }),
      });
      const t = (await r.json())?.content?.[0]?.text;
      if (t) m.analysis = t;
    } catch (e) { console.warn("Analyse ignorée :", m.id, e.message); }
  }
}

writeFileSync(OUT, JSON.stringify({ updated_at: new Date().toISOString(), source: URL_TV, matches }, null, 1));
console.log(`${matches.length} matchs confirmés à la TV.`);
