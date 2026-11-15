// Détection stricte des matchs de football en direct dans un programme TV (XMLTV).
const COMPETITIONS = [
  ["Ligue 1", /ligue 1/i], ["Ligue 2", /ligue 2/i], ["Premier League", /premier league/i],
  ["Liga", /\bliga\b|laliga/i], ["Serie A", /serie a/i], ["Bundesliga", /bundesliga/i],
  ["Ligue des champions", /ligue des champions|champions league/i],
  ["Europa League", /europa league/i], ["Conference League", /conference league/i],
  ["Coupe du monde", /coupe du monde|world cup/i], ["Euro", /\beuro 20\d\d|\bchampionnat d'europe/i],
  ["CAN", /\bcan\b|coupe d'afrique/i],
];
const NOT_LIVE = /replay|rediffusion|r[ée]sum[ée]|magazine|avant-match|apr[èe]s-match|d[ée]brief|club|le meilleur|best of|analyse|week-?end|journal/i;
const IS_FOOT = /football|\bfoot\b/i;

export const detectCompetition = (t) => COMPETITIONS.find(([, re]) => re.test(t))?.[0] ?? null;

export function parseTeams(title) {
  const s = title.includes(":") ? title.split(":").slice(1).join(":") : title;
  const m = s.split(/\s+(?:-|–|\/|vs\.?|contre)\s+/i);
  if (m.length !== 2) return null;
  const [home, away] = m.map((x) => x.replace(/\(.*?\)/g, "").trim());
  return home && away && home.length < 40 && away.length < 40 ? { home, away } : null;
}

export function isLiveFootballMatch(title, desc, cat) {
  const all = `${title} ${desc} ${cat}`;
  if (!IS_FOOT.test(all) && !detectCompetition(all)) return false;
  if (NOT_LIVE.test(title)) return false;
  return parseTeams(title) !== null;
}

// "20261115210000 +0100" -> ISO
export function parseXmltvDate(s) {
  const m = String(s).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
  if (!m) return null;
  const tz = m[7] ? `${m[7].slice(0, 3)}:${m[7].slice(3)}` : "+00:00";
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${tz}`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
