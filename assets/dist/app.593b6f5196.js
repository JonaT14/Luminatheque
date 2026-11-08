/* Luminathèque — application monopage, sans dépendance (PDF.js chargé à la demande). */
(() => {
"use strict";
const D = window.LUMINA;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fold = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const store = {
  get(k, d) { try { const v = localStorage.getItem("lumina:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("lumina:" + k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
};

/* ---------------- référentiels ---------------- */
const TYPES = {
  ma: ["Méta-analyse", "syn"], sr: ["Revue systématique", "syn"], umbrella: ["Revue parapluie", "syn"], guideline: ["Recommandation", "syn"],
  rct: ["Essai randomisé", "rct"], nrct: ["Essai non randomisé", "clin"], cohort: ["Cohorte / observationnelle", "clin"],
  cases: ["Série de cas", "clin"], review: ["Revue narrative", "fond"], preclinical: ["Préclinique", "fond"],
  protocol: ["Protocole", "autre"], survey: ["Enquête", "autre"], qualitative: ["Étude qualitative", "autre"],
  biblio: ["Bibliométrie", "autre"], methodo: ["Méta-recherche", "autre"], letter: ["Correspondance", "autre"], autre: ["Article (non classé)", "autre"],
};
const GROUPS = [
  { id: "syn", label: "Synthèses systématiques", color: "var(--s1)" },
  { id: "rct", label: "Essais randomisés", color: "var(--s2)" },
  { id: "clin", label: "Études cliniques non randomisées", color: "var(--s3)" },
  { id: "fond", label: "Revues narratives & préclinique", color: "var(--s4)" },
  { id: "autre", label: "Autres (protocoles, enquêtes, lettres…)", color: "var(--s-other)" },
];
const LEVELS = {
  1: ["Synthèse d'essais", "Revue systématique ou méta-analyse d'essais randomisés"],
  2: ["Essai randomisé", "Essai contrôlé randomisé"],
  3: ["Contrôlé non randomisé", "Essai non randomisé, revue mêlant plusieurs plans d'étude"],
  4: ["Série / cohorte sans témoin", "Cohorte rétrospective, témoins historiques, séries de cas"],
  5: ["Avis & mécanismes", "Revue narrative, avis d'experts, études animales ou in vitro"],
  0: ["Non gradé", "Protocole, enquête, étude qualitative, bibliométrie, correspondance"],
};
const EFFECTS = { favorable: ["Favorable à la PBM", "var(--fav)"], "mitigé": ["Mitigé", "var(--mit)"], neutre: ["Neutre / équivalent", "var(--neu)"], "défavorable": ["Défavorable", "var(--def)"] };
const CTX = { coronaires: "Infarctus & coronaropathie", "insuffisance-c": "Insuffisance cardiaque & réadaptation", "chir-cardio": "Chirurgie cardiaque", "artères": "Artères, Raynaud & microcirculation", HTA: "Hypertension & risque cardiométabolique", ILIB: "Irradiation sanguine (ILIB)", ORL: "Radiothérapie ORL", chimio: "Chimiothérapie", CSH: "Greffe de CSH", mixte: "Contextes mixtes", CIPN: "Neuropathie chimio-induite", "diabète": "Neuropathie diabétique", compression: "Compressions nerveuses", "lésion nerveuse": "Lésions nerveuses", orofaciale: "Orofaciale", autres: "Autres", GSM: "Sécheresse & syndrome génito-urinaire", onco: "Après cancer & sénologie", vulve: "Vulve & vagin", pelvien: "Dysménorrhée & douleurs pelviennes", "obstétrique": "Périnée, accouchement & allaitement", "fertilité": "Fertilité & ovaire", "général": "Revues & recommandations", tendon: "Tendinopathies & enthèses", arthrose: "Arthrose & arthrites", rachis: "Rachis : lombalgie, cervicalgie, radiculopathie", ATM: "ATM & douleurs orofaciales", fibro: "Fibromyalgie & douleur myofasciale", "épaule": "Épaule", os: "Os, fractures & implants", muscle: "Muscle, sport & récupération", plaies: "Plaies & ulcères", cicatrices: "Cicatrices & brûlures", radiodermite: "Radiodermite", "alopécie": "Alopécie", inflammatoire: "Acné & dermatoses inflammatoires", "esthétique": "Vieillissement & esthétique", infections: "Herpès & infections cutanées", pigmentation: "Vitiligo & pigmentation", EDS: "Ehlers-Danlos & hypermobilité", SEP: "Sclérose en plaques", SLA: "Maladie de Charcot (SLA)", parkinson: "Maladie de Parkinson", tremblements: "Tremblements & dystonies", "démences": "Démences & déclin cognitif", fatigue: "Fatigue chronique & Covid long", AVC: "AVC & aphasie", TC: "Traumatismes crâniens & commotions", neurodev: "Autisme & neurodéveloppement", humeur: "Dépression, anxiété & sommeil", DMLA: "Dégénérescence maculaire (DMLA)", myopie: "Myopie de l'enfant", "sécheresse": "Sécheresse oculaire & paupières", "rétinopathie": "Rétinopathies", glaucome: "Glaucome & nerf optique", amblyopie: "Amblyopie", chirurgie: "Dents de sagesse & extractions", ortho: "Orthodontie", implants: "Implants & greffes osseuses", paro: "Parodontologie", "hypersensibilité": "Hypersensibilité dentinaire", endo: "Endodontie", ONM: "Ostéonécrose des mâchoires", "anesthésie": "Anesthésie, douleur & anxiété au fauteuil", "lymphœdème": "Lymphœdème", trismus: "Trismus & fibrose radio-induite", "xérostomie": "Xérostomie", "main-pied": "Syndrome main-pied & ongles", "acouphènes": "Acouphènes", "surdité": "Surdité", rhinite: "Rhinite allergique", sinusite: "Rhinosinusite", odorat: "Odorat & goût", pharynx: "Gorge, amygdales & voix", vertiges: "Vertiges", performance: "Performance musculaire", "récupération": "Récupération & courbatures", blessures: "Blessures sportives", populations: "Sujets âgés & malades chroniques" };
const SUB_DESC = { coronaires: "Infarctus, angor, resténose après angioplastie, lésions d'ischémie-reperfusion", "insuffisance-c": "Capacité d'effort, fatigue musculaire, réadaptation cardiaque", "chir-cardio": "Sternotomie et prélèvement saphène après pontage, complications postopératoires", "artères": "Phénomène de Raynaud, artériopathie, microcirculation, fonction endothéliale", HTA: "Pression artérielle, lipides, inflammation, obésité", ILIB: "Laser intraveineux ou transcutané sur une artère : biomarqueurs, sepsis, AVC", GSM: "Atrophie vulvovaginale, sécheresse, dyspareunie, incontinence de la ménopause", onco: "Toxicités vulvovaginales après cancer du sein ou gynécologique, sténose, plaies", vulve: "Vulvodynie, vestibulodynie, lichen scléreux, candidose et vaginose", pelvien: "Dysménorrhée, douleur pelvienne chronique, cystite interstitielle", "obstétrique": "Périnée post-partum, travail, crevasses de l'allaitement", "fertilité": "Ovaire, ovocytes, endomètre, oncofertilité", tendon: "Épicondylite, tendinopathie d'Achille, aponévrosite plantaire", arthrose: "Gonarthrose, coxarthrose, polyarthrite", rachis: "Lombalgie, cervicalgie, hernie discale, radiculopathie", ATM: "Dysfonction temporo-mandibulaire, bruxisme", fibro: "Fibromyalgie, points gâchettes", "épaule": "Capsulite, conflit sous-acromial, coiffe des rotateurs", os: "Consolidation osseuse, fractures, ostéo-intégration", muscle: "Performance, fatigue, récupération, lésions musculaires", plaies: "Ulcères diabétiques, veineux, escarres, plaies chroniques", cicatrices: "Cicatrisation, chéloïdes, brûlures", radiodermite: "Prévention et traitement des radiodermites", "alopécie": "Alopécie androgénétique, chimio-induite", inflammatoire: "Acné, psoriasis, dermatite atopique, rosacée", "esthétique": "Rides, photovieillissement, rajeunissement cutané", infections: "Herpès labial, onychomycose, infections", pigmentation: "Vitiligo, mélasma", EDS: "Syndrome d'Ehlers-Danlos, hypermobilité articulaire, douleur et proprioception", SEP: "Fatigue, spasticité, douleur, neuroprotection", SLA: "Maladie de Charcot, maladie du motoneurone", parkinson: "Symptômes moteurs et non moteurs, PBM transcrânienne et abdominale", tremblements: "Tremblement essentiel, dystonies", "démences": "Alzheimer, troubles cognitifs légers, cognition", fatigue: "Encéphalomyélite myalgique, syndrome post-Covid", AVC: "Récupération motrice, aphasie, AVC aigu (essais NEST)", TC: "Traumatisme crânien, commotion, séquelles cognitives", neurodev: "Autisme, TDAH, paralysie cérébrale", humeur: "Dépression, anxiété, insomnie, stress post-traumatique", DMLA: "DMLA sèche, drusen, atrophie géographique (Valeda)", myopie: "Lumière rouge basse intensité répétée, longueur axiale", "sécheresse": "Œil sec, dysfonction meibomienne, blépharite", "rétinopathie": "Rétinopathie et œdème maculaire diabétiques", glaucome: "Glaucome, neuropathies optiques", amblyopie: "Amblyopie de l'enfant", chirurgie: "Douleur, œdème et trismus après extraction, alvéolite", ortho: "Douleur orthodontique, accélération du mouvement dentaire", implants: "Stabilité implantaire, ostéo-intégration, greffes", paro: "Parodontite, gingivite, cicatrisation gingivale", "hypersensibilité": "Hypersensibilité dentinaire", endo: "Douleur post-endodontique, lésions périapicales, pulpe", ONM: "Ostéonécrose des mâchoires médicamenteuse ou radio-induite", "anesthésie": "Douleur de l'injection, réflexe nauséeux, anxiété", "lymphœdème": "Lymphœdème du bras après cancer du sein, membre inférieur", trismus: "Trismus, fibrose cervicale après radiothérapie", "xérostomie": "Bouche sèche après radiothérapie ou greffe", "main-pied": "Syndrome main-pied, toxicités unguéales", "acouphènes": "Acouphènes chroniques", "surdité": "Surdité, surdité brusque, ototoxicité", rhinite: "Photothérapie endonasale", sinusite: "Rhinosinusite chronique", odorat: "Anosmie, troubles post-Covid", pharynx: "Suites d'amygdalectomie, pharyngite, voix", vertiges: "Vertiges, troubles vestibulaires", performance: "Force, endurance, préconditionnement", "récupération": "Courbatures, CK, fatigue musculaire", blessures: "Lésions musculaires et tendineuses du sportif", populations: "Effort chez le sujet âgé ou malade" };
const yearsOf = (list) => [...new Set(list.map((a) => a.year))].sort();
const READ = { 1: ["Express", "1–2 lignes"], 2: ["Essentiel", "1–2 paragraphes"], 3: ["Approfondi", "analyse complète"] };
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const ICON = {
  up: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2l4 6H2z" fill="currentColor"/></svg>',
  down: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10L2 4h8z" fill="currentColor"/></svg>',
  eq: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4h8v1.5H2zM2 7h8v1.5H2z" fill="currentColor"/></svg>',
  mix: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1l3 4H3zM6 11L3 7h6z" fill="currentColor"/></svg>',
};
const EFF_ICON = { favorable: ICON.up, "défavorable": ICON.down, neutre: ICON.eq, "mitigé": ICON.mix };

/* ---------------- état ---------------- */
const state = {
  topic: store.get("topic", D.topics[0]?.id),
  level: store.get("level", 1),
  q: "",
  limit: 60,
  f: { fiche: new Set(), years: new Set(), groups: new Set(), levels: new Set(), pops: new Set(), ctx: new Set(), effects: new Set(), themes: new Set(), pdf: false, key: false, from: "", to: "" },
  sort: "date",
  cardLevel: new Map(),
  selected: new Set(store.get("selected", [])),
  synTab: "global", essTab: "now", essCtx: "", essReg: "", essQ: "", devKind: "type", devQ: "", devTopic: "", parScope: "topic",
  cmp: null,
};
const topic = () => D.topics.find((t) => t.id === state.topic) || D.topics[0];
const isSoon = (t = topic()) => t.status === "à venir";
D.articles = D.articles || [];
const LOADED = new Set();
const loadScript0 = (src) => new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
// Les notices non analysées sont allégées à la construction (valeurs par défaut omises) : on les restaure ici.
function hydrate(a, id) {
  a.topic = id;
  if (a.curated !== false) { if (!a.week) a.week = weekOf(a.date).key; return a; }
  return Object.assign({ theme: "Non analysé", effect: "—", pop: "—", aim: "—", mode: [], nm: [], n: null, doi: null, pmcid: null,
    license: null, pdf: null, oa: false, cited_by: 0, pub_types: [], title_fr: a.title, journal: a.journal_abbr, week: weekOf(a.date).key }, a);
}
async function ensureTopic(id) {
  if (LOADED.has(id)) return;
  const t = D.topics.find((x) => x.id === id);
  if (!t || !t.file) { LOADED.add(id); return; }
  await loadScript0(t.file);
  const arts = ((window.LUMINA_T || {})[id] || []).map((a) => hydrate(a, id));
  D.articles.push(...arts); LOADED.add(id); INDEX.clear();
}
const all = () => D.articles.filter((a) => a.topic === state.topic);
const byId = (id) => D.articles.find((a) => a.pmid === id && a.topic === state.topic) || D.articles.find((a) => a.pmid === id);
const ABS = new Map();
async function abstractOf(a) {
  if (a.abstract) return a.abstract;
  const key = `${a.topic}/${String(Number(a.pmid) % (D.n_chunks || 40)).padStart(2, "0")}`;
  if (!ABS.has(key)) ABS.set(key, fetch(`${(D.topics.find((x) => x.id === a.topic) || {}).abs || "assets/abs/" + a.topic}/${key.split("/")[1]}.json`).then((r) => r.json()).catch(() => ({})));
  return (await ABS.get(key))[a.pmid] || [];
}
const typeLabel = (a) => (TYPES[a.type] || [a.type])[0];
const groupOf = (a) => (TYPES[a.type] || [, "autre"])[1];

/* ---------------- dates & semaines ---------------- */
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const iso = (dt) => dt.toISOString().slice(0, 10);
function isoWeekStart(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const mon = new Date(jan4); mon.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  return mon;
}
function weekOf(dateStr) {
  const d = parse(dateStr); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = d.getUTCFullYear(); const w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return { y, w, key: `${y}-S${String(w).padStart(2, "0")}` };
}
const fmtDate = (s, long) => { const d = parse(s); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${long !== false ? " " + d.getUTCFullYear() : ""}`; };
function weekLabel(key) {
  const [y, w] = key.split("-S").map(Number); const a = isoWeekStart(y, w); const b = new Date(a); b.setUTCDate(a.getUTCDate() + 6);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  return `${sameMonth ? a.getUTCDate() : fmtDate(iso(a), false)}–${fmtDate(iso(b))}`;
}
const today = () => iso(new Date());

/* ---------------- recherche ---------------- */
const INDEX = new Map();
function indexOf(a) {
  if (INDEX.has(a.pmid)) return INDEX.get(a.pmid);
  const l3 = a.l3 ? [...(a.l3.points || []), ...(a.l3.limites || []), a.l3.pratique || ""].join(" ") : "";
  const fields = [
    [5, a.title_fr + " " + a.title], [4, a.theme + " " + typeLabel(a)], [3, a.l1 + " " + (a.keywords || []).join(" ")],
    [2, (a.l2 || "") + " " + (a.kw || "") + " " + a.journal + " " + (a.authors || []).join(" ") + " " + (a.nm || []).join(" nm ") + " nm " + (a.mode || []).join(" ") + " " + (a.ctx || []).map((c) => CTX[c] || c).join(" ") + " " + a.pop],
    [1, l3 + " " + (a.abstract || []).map((x) => x.text).join(" ") + " " + a.pmid + " " + (a.doi || "")],
  ].map(([w, t]) => [w, fold(t)]);
  INDEX.set(a.pmid, fields); return fields;
}
const tokens = (q) => fold(q).split(/[\s,;]+/).filter((t) => t.length > 1 || /\d/.test(t));
function score(a, toks) {
  if (!toks.length) return 1;
  const f = indexOf(a); let s = 0;
  for (const t of toks) { let hit = 0; for (const [w, txt] of f) if (txt.includes(t)) hit += w; if (!hit) return 0; s += hit; }
  return s;
}
const ACC = { a: "[aàâä]", e: "[eéèêë]", i: "[iîï]", o: "[oôö]", u: "[uùûü]", c: "[cç]" };
function hl(text, q) {
  const t = esc(text); const toks = tokens(q); if (!toks.length) return t;
  const re = new RegExp("(" + toks.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[aeiouc]/g, (c) => ACC[c])).join("|") + ")", "gi");
  return t.replace(re, "<mark>$1</mark>");
}

/* ---------------- filtres ---------------- */
function filtered(list = all()) {
  const f = state.f; const toks = tokens(state.q);
  let out = list.map((a) => [a, score(a, toks)]).filter(([a, s]) => {
    if (!s) return false;
    if (f.years.size && !f.years.has(a.year)) return false;
    if (f.groups.size && !f.groups.has(groupOf(a))) return false;
    if (f.levels.size && !f.levels.has(a.level)) return false;
    if (f.pops.size && !f.pops.has(a.pop)) return false;
    if (f.ctx.size && !(a.ctx || []).some((c) => f.ctx.has(c))) return false;
    if (f.effects.size && !f.effects.has(a.effect)) return false;
    if (f.themes.size && !f.themes.has(a.theme)) return false;
    if (f.pdf && !a.pdf) return false;
    if (f.key && !a.key) return false;
    if (f.fiche.size && !f.fiche.has(a.curated === false ? "indexée" : "rédigée")) return false;
    if (f.from && a.date < f.from) return false;
    if (f.to && a.date > f.to) return false;
    return true;
  });
  const sorters = {
    date: (x, y) => y[0].date.localeCompare(x[0].date),
    pertinence: (x, y) => y[1] - x[1] || y[0].date.localeCompare(x[0].date),
    preuve: (x, y) => (x[0].level || 9) - (y[0].level || 9) || y[0].date.localeCompare(x[0].date),
    effectif: (x, y) => (y[0].n || 0) - (x[0].n || 0),
  };
  out.sort(sorters[state.sort] || sorters.date);
  return out.map(([a]) => a);
}
const countBy = (list, fn) => list.reduce((m, a) => { for (const k of [].concat(fn(a))) m.set(k, (m.get(k) || 0) + 1); return m; }, new Map());

/* ---------------- petits composants ---------------- */
const lvlBadge = (a) => `<span class="lvl" data-l="${a.level}" title="${esc(LEVELS[a.level][1])}"><i>${a.level || "–"}</i>${a.level ? "Niveau " + a.level : "Non gradé"}</span>`;
const typeBadge = (a) => { const g = GROUPS.find((g) => g.id === groupOf(a)); return `<span class="badge"><span class="dot" style="background:${g.color}"></span>${esc(typeLabel(a))}</span>`; };
const effBadge = (a) => EFFECTS[a.effect] ? `<span class="eff" data-e="${a.effect}">${EFF_ICON[a.effect]}${esc(EFFECTS[a.effect][0])}</span>` : "";
const levelBars = (n) => `<span class="level-bars" aria-hidden="true">${[1, 2, 3].map((i) => `<span class="${i <= n ? "on" : ""}"></span>`).join("")}</span>`;
function levelSwitch(cur, attr = "data-read") {
  return `<div class="levels" role="group" aria-label="Niveau de lecture">${[1, 2, 3].map((n) => `<button type="button" ${attr}="${n}" aria-pressed="${n === cur}">${levelBars(n)}${READ[n][0]}<small>${READ[n][1]}</small></button>`).join("")}</div>`;
}
const metaLine = (a) => `<span class="mono">${fmtDate(a.date)}</span> · ${esc(a.journal_abbr || a.journal)}${a.n ? ` · <span class="mono">n = ${a.n}</span>` : ""}${a.nm?.length ? ` · <span class="mono">${a.nm.join("/")} nm</span>` : ""}`;
function l3Html(a) {
  const x = a.l3 || {};
  return `${x.points?.length ? `<h4>Méthode et résultats clés</h4><ul>${x.points.map((p) => `<li>${hl(p, state.q)}</li>`).join("")}</ul>` : ""}
    ${x.limites?.length ? `<h4>Limites</h4><ul>${x.limites.map((p) => `<li>${hl(p, state.q)}</li>`).join("")}</ul>` : ""}
    ${x.pratique && x.pratique !== "—" ? `<div class="callout"><b>Pour la pratique.</b> ${hl(x.pratique, state.q)}</div>` : ""}`;
}
const paras = (t) => String(t || "").split(/\n\n+/).map((p) => `<p>${hl(p, state.q)}</p>`).join("");

function cardRaw(a, opts = {}) {
  return `<article class="card raw" data-pmid="${a.pmid}">
    <div class="card-top"><div class="badges"><span class="badge raw-badge">Non analysé</span>${typeBadge(a)}${lvlBadge(a)}${(a.ctx || []).slice(0, 2).map((c) => `<span class="badge">${esc(CTX[c] || c)}</span>`).join("")}</div>
    ${opts.noSel ? "" : `<label class="sel"><input type="checkbox" data-sel="${a.pmid}" ${state.selected.has(a.pmid) ? "checked" : ""}> Sélectionner</label>`}</div>
    <h3 lang="en"><a href="#article-${a.pmid}">${hl(a.title, state.q)}</a></h3>
    <div class="src">${metaLine(a)}</div>
    ${a.l1 ? `<p class="l1" lang="en"><span class="eyebrow" style="display:block;margin-bottom:4px">Conclusion des auteurs (VO)</span>${hl(a.l1, state.q)}</p>` : ""}
    <div class="card-actions"><a class="btn small" href="#article-${a.pmid}">Résumé complet</a><a class="btn small" href="https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/" target="_blank" rel="noopener">PubMed ↗</a></div></article>`;
}
function card(a, opts = {}) {
  if (!a.curated && a.curated !== undefined) return cardRaw(a, opts);
  const lv = state.cardLevel.get(a.pmid) || state.level;
  const body = lv === 1 ? `<p class="l1">${hl(a.l1, state.q)}</p>`
    : lv === 2 ? `<p class="l1">${hl(a.l1, state.q)}</p><div class="more prose">${paras(a.l2)}</div>`
    : `<p class="l1">${hl(a.l1, state.q)}</p><div class="more prose">${paras(a.l2)}${l3Html(a)}</div>`;
  return `<article class="card" data-pmid="${a.pmid}">
    <div class="card-top"><div class="badges">${typeBadge(a)}${lvlBadge(a)}${effBadge(a)}${a.pdf ? '<span class="pdf-flag">PDF</span>' : ""}${a.key ? '<span class="star">★ À retenir</span>' : ""}</div>
    ${opts.noSel ? "" : `<label class="sel"><input type="checkbox" data-sel="${a.pmid}" ${state.selected.has(a.pmid) ? "checked" : ""}> Sélectionner</label>`}</div>
    <h3><a href="#article-${a.pmid}">${hl(a.title_fr, state.q)}</a></h3>
    <div class="src">${metaLine(a)}</div>
    ${body}
    <div class="card-actions">
      ${lv < 3 ? `<button class="btn small" data-more="${a.pmid}">${levelBars(lv + 1)}Lire plus · ${READ[lv + 1][0]}</button>` : `<button class="btn small" data-less="${a.pmid}">Réduire</button>`}
      <a class="btn small" href="#article-${a.pmid}">Fiche complète${a.pdf ? " + PDF" : ""}</a>
    </div></article>`;
}

/* ---------------- graphiques (SVG à la main) ---------------- */
const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; document.body.appendChild(tip);
document.addEventListener("pointermove", (e) => {
  const t = e.target.closest?.("[data-tip]");
  if (!t) { tip.hidden = true; return; }
  tip.innerHTML = t.getAttribute("data-tip"); tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
  tip.style.left = x + "px"; tip.style.top = y + "px";
});
const legend = (items) => `<div class="legend">${items.map(([l, c]) => `<span><i style="background:${c}"></i>${esc(l)}</span>`).join("")}</div>`;

function chartYearly(list) {
  const ys = yearsOf(list); const years = []; for (let y = ys[0]; y <= ys[ys.length - 1]; y++) years.push(y);
  const data = years.map((y) => { const xs = list.filter((a) => a.year === y); return { y, n: xs.length, by: GROUPS.map((g) => xs.filter((a) => groupOf(a) === g.id).length) }; });
  const max = Math.max(4, ...data.map((d) => d.n)); const step = max > 200 ? 100 : max > 80 ? 40 : max > 20 ? 10 : 2; const top = Math.ceil(max / step) * step;
  const W = 720, H = 240, L = 34, R = 6, T = 10, B = 28; const bw = (W - L - R) / years.length; const y = (v) => T + (H - T - B) * (1 - v / top);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Publications par an et par type d'étude">`;
  for (let v = 0; v <= top; v += step) s += `<g class="grid"><line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/></g><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  data.forEach((d, i) => { let acc = 0; const x = L + i * bw + 1.5; const w = Math.max(2, bw - 3);
    d.by.forEach((c, gi) => { if (!c) return; const y0 = y(acc), y1 = y(acc + c); acc += c; s += `<rect x="${x}" y="${y1 + 1}" width="${w}" height="${Math.max(0, y0 - y1 - 1)}" fill="${GROUPS[gi].color}" rx="${acc === d.n ? 3 : 0}"/>`; });
    if (d.y % 5 === 0 || i === years.length - 1) s += `<text x="${x + w / 2}" y="${H - B + 16}" text-anchor="middle">${d.y}</text>`;
    s += `<rect class="hit" x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" data-tip="${esc(`<b>${d.y}</b> · ${d.n} publication(s)<br>` + GROUPS.map((g, gi) => d.by[gi] ? `${g.label} : ${d.by[gi]}` : "").filter(Boolean).join("<br>"))}"/>`; });
  return `<div class="chart">${s}<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--ink-2)"/></svg></div>${legend(GROUPS.map((g) => [g.label, g.color]))}`;
}
function chartMonthly(list) {
  if (yearsOf(list).length > 6) return chartYearly(list);
  const months = []; const start = parse(topic().since || "2024-01-01"); const end = parse(today());
  for (let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); d <= end; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(iso(d).slice(0, 7));
  const data = months.map((m) => { const xs = list.filter((a) => a.date.startsWith(m)); return { m, xs, by: GROUPS.map((g) => xs.filter((a) => groupOf(a) === g.id).length) }; });
  const max = Math.max(4, ...data.map((d) => d.xs.length)); const top = Math.ceil(max / 2) * 2;
  const W = 720, H = 230, L = 28, R = 6, T = 10, B = 34; const bw = (W - L - R) / months.length;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Publications par mois et par type d'étude">`;
  for (let v = 0; v <= top; v += Math.max(1, top / 4)) s += `<g class="grid"><line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/></g><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  data.forEach((d, i) => {
    let acc = 0; const x = L + i * bw + 1.5; const w = Math.max(2, bw - 3);
    d.by.forEach((c, gi) => { if (!c) return; const y0 = y(acc), y1 = y(acc + c); acc += c;
      s += `<rect x="${x}" y="${y1 + 1}" width="${w}" height="${Math.max(0, y0 - y1 - 1)}" fill="${GROUPS[gi].color}" rx="${acc === d.xs.length ? 3 : 0}"/>`; });
    const [yy, mm] = d.m.split("-"); if (mm === "01" || mm === "07") s += `<text x="${x + w / 2}" y="${H - B + 16}" text-anchor="middle">${MONTHS[+mm - 1]}</text>${mm === "01" ? `<text x="${x + w / 2}" y="${H - B + 30}" text-anchor="middle" style="font-weight:700">${yy}</text>` : ""}`;
    const tipTxt = `<b>${MONTHS[+mm - 1]} ${yy}</b> · ${d.xs.length} publication(s)<br>` + GROUPS.map((g, gi) => d.by[gi] ? `${g.label} : ${d.by[gi]}` : "").filter(Boolean).join("<br>");
    s += `<rect class="hit" x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" data-tip="${esc(tipTxt)}"/>`;
  });
  s += `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--ink-2)" stroke-width="1"/></svg>`;
  return `<div class="chart">${s}</div>${legend(GROUPS.map((g) => [g.label, g.color]))}`;
}

const TIERS = [["solid", "Preuve solide", "niveaux 1–2", [1, 2]], ["mid", "Preuve intermédiaire", "niveau 3", [3]], ["weak", "Preuve faible", "niveaux 4–5", [4, 5]]];
function chartPyramid(list) {
  const counts = countBy(list, (a) => a.level);
  const graded = [1, 2, 3, 4, 5].reduce((t, l) => t + (counts.get(l) || 0), 0);
  const max = Math.max(1, ...[1, 2, 3, 4, 5].map((l) => counts.get(l) || 0));
  const legend = `<div class="ev-legend">${TIERS.map(([k, label, sub]) => `<span class="ev-chip ev-${k}"><i></i>${label.replace("Preuve ", "").replace(/^./, (c) => c.toUpperCase())} · ${sub}</span>`).join("")}</div>`;
  const groups = TIERS.map(([k, label, , levels]) => `<div class="ev-group ev-${k}"><div class="ev-tier">${label}</div>${levels.map((l) => {
    const n = counts.get(l) || 0; const pct = graded ? Math.round(100 * n / graded) : 0;
    return `<div class="ev-row" data-tip="${esc(`<b>Niveau ${l} · ${LEVELS[l][0]}</b><br>${LEVELS[l][1]}<br>${n} publication(s), ${pct} %`)}">
      <span class="ev-badge">${l}</span>
      <span class="ev-name"><b>${LEVELS[l][0]}</b><span class="ev-gauge" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<i class="${i < 6 - l ? "on" : ""}"></i>`).join("")}</span></span>
      <span class="ev-bar"><i style="width:${Math.max(2, 100 * n / max)}%"></i><b>${n}<small> · ${pct} %</small></b></span></div>`;
  }).join("")}</div>`).join("");
  return `<div class="evidence">${legend}${groups}<p class="ev-foot"><span>Non gradés (protocoles, enquêtes, lettres…)</span><b class="mono">${counts.get(0) || 0}</b></p></div>`;
}

function chartForest(list) {
  const rows = list.filter((a) => a.metric?.kind === "rr").sort((a, b) => a.date.localeCompare(b.date));
  if (!rows.length) return '<p class="muted">Aucune estimation poolée dans cette sélection.</p>';
  const W = 560, rowH = 44, T = 26, H = T + rows.length * rowH + 30, L = 190, R = 112;
  const lo = 0.2, hi = 1.6; const x = (v) => L + (W - L - R) * (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Risques relatifs poolés des méta-analyses">`;
  for (const v of [0.25, 0.5, 0.75, 1, 1.5]) s += `<g class="grid"><line x1="${x(v)}" x2="${x(v)}" y1="${T - 6}" y2="${H - 26}"/></g><text x="${x(v)}" y="${H - 10}" text-anchor="middle">${String(v).replace(".", ",")}</text>`;
  s += `<line class="ref" x1="${x(1)}" x2="${x(1)}" y1="${T - 10}" y2="${H - 26}"/>`;
  s += `<text x="${x(0.45)}" y="${T - 12}" text-anchor="middle">← favorise la PBM</text><text x="${x(1.25)}" y="${T - 12}" text-anchor="middle">favorise le témoin →</text>`;
  rows.forEach((a, i) => {
    const m = a.metric; const cy = T + i * rowH + rowH / 2;
    const lab = `${a.journal_abbr || a.journal} ${a.year}`; const sub = `${m.outcome}${m.k ? ` · ${m.k} essais` : ""}`;
    s += `<text x="0" y="${cy - 3}" style="font-weight:600;fill:var(--ink)">${esc(lab.length > 26 ? lab.slice(0, 25) + "…" : lab)}</text><text x="0" y="${cy + 12}">${esc(sub.length > 28 ? sub.slice(0, 27) + "…" : sub)}</text>`;
    if (m.lo && m.hi) s += `<line x1="${x(Math.max(lo, m.lo))}" x2="${x(Math.min(hi, m.hi))}" y1="${cy}" y2="${cy}" stroke="var(--s1)" stroke-width="2"/>`;
    s += `<rect x="${x(m.rr) - 6}" y="${cy - 6}" width="12" height="12" rx="2" fill="${m.lo ? "var(--s1)" : "var(--surface)"}" stroke="var(--s1)" stroke-width="2"/>`;
    s += `<text x="${W - R + 10}" y="${cy + 4}" class="mono" style="fill:var(--ink)">${String(m.rr.toFixed(2)).replace(".", ",")}${m.lo ? ` [${String(m.lo.toFixed(2)).replace(".", ",")}–${String(m.hi.toFixed(2)).replace(".", ",")}]` : " (IC n.d.)"}</text>`;
    s += `<a href="#article-${a.pmid}"><rect class="hit" x="0" y="${cy - rowH / 2}" width="${W}" height="${rowH}" data-tip="${esc(`<b>${a.title_fr}</b><br>RR ${m.rr}${m.lo ? ` [${m.lo}–${m.hi}]` : ""} · cliquer pour ouvrir la fiche`)}"/></a>`;
  });
  return `<div class="chart">${s}</svg></div><p class="muted" style="font-size:.8rem">Risque relatif (échelle logarithmique). En dessous de 1, moins de mucites avec la PBM. Carré vide : intervalle de confiance non rapporté dans le résumé.</p>`;
}

function chartDumbbell(list) {
  const rows = list.filter((a) => a.metric?.kind === "rates").sort((a, b) => (a.metric.a - a.metric.b) - (b.metric.a - b.metric.b));
  if (!rows.length) return '<p class="muted">Aucun taux comparatif dans cette sélection.</p>';
  const W = 560, rowH = 46, T = 18, H = T + rows.length * rowH + 28, L = 218, R = 16;
  const x = (v) => L + (W - L - R) * v / 100;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Taux d'événements, bras étudié contre comparateur">`;
  for (const v of [0, 25, 50, 75, 100]) s += `<g class="grid"><line x1="${x(v)}" x2="${x(v)}" y1="${T - 6}" y2="${H - 24}"/></g><text x="${x(v)}" y="${H - 8}" text-anchor="middle">${v} %</text>`;
  rows.forEach((a, i) => {
    const m = a.metric; const cy = T + i * rowH + rowH / 2;
    const lab = `${(a.journal_abbr || "").slice(0, 18)} ${a.year} · n = ${a.n ?? "?"}`; const sub = m.outcome;
    s += `<text x="0" y="${cy - 3}" style="font-weight:600;fill:var(--ink)">${esc(lab)}</text><text x="0" y="${cy + 12}">${esc(sub.length > 28 ? sub.slice(0, 27) + "…" : sub)}</text>`;
    s += `<line x1="${x(m.a)}" x2="${x(m.b)}" y1="${cy}" y2="${cy}" stroke="var(--line)" stroke-width="4" stroke-linecap="round"/>`;
    s += `<circle cx="${x(m.b)}" cy="${cy}" r="6" fill="var(--s2)" stroke="var(--surface)" stroke-width="2"/><circle cx="${x(m.a)}" cy="${cy}" r="6" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/>`;
    s += `<a href="#article-${a.pmid}"><rect class="hit" x="0" y="${cy - rowH / 2}" width="${W}" height="${rowH}" data-tip="${esc(`<b>${a.title_fr}</b><br>${m.a_label} : ${String(m.a).replace(".", ",")} %<br>${m.b_label} : ${String(m.b).replace(".", ",")} %`)}"/></a>`;
  });
  return `<div class="chart">${s}</svg></div>${legend([["Bras étudié (PBM ou modalité testée)", "var(--s1)"], ["Comparateur (placebo, standard ou autre voie)", "var(--s2)"]])}`;
}

const WL_BANDS = [["Visible", "Bleu", 400, 499, "b"], ["Visible", "Vert-jaune", 500, 599, "g"], ["Visible", "Rouge", 600, 649, "r"], ["Visible", "Rouge", 650, 699, "r"],
  ["Visible", "Rouge lointain", 700, 799, "fr"], ["Proche infrarouge (invisible)", "Infrarouge", 800, 899, "ir"], ["Proche infrarouge (invisible)", "Infrarouge", 900, 999, "ir"], ["Proche infrarouge (invisible)", "Infrarouge", 1000, 1200, "ir"]];
const wlClass = (nm) => (WL_BANDS.find((b) => nm >= b[2] && nm <= b[3]) || [, , , , "ir"])[4];
function chartSpectrum(list) {
  const withNm = list.filter((a) => a.nm?.length);
  if (!withNm.length) return `<div class="empty small">Aucune fiche rédigée ne précise encore de longueur d'onde pour ce thème.</div>`;
  const per = withNm.map((a) => [...new Set(a.nm.map(Math.round))]);
  const counts = new Map(); per.forEach((ns) => ns.forEach((n) => counts.set(n, (counts.get(n) || 0) + 1)));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 6);
  const bands = WL_BANDS.map(([g, name, lo, hi, k]) => [g, name, lo, hi, k, per.filter((ns) => ns.some((n) => n >= lo && n <= hi)).length]).filter((b) => b[5] || b[4] === "r" || b[4] === "ir");
  const max = Math.max(1, ...bands.map((b) => b[5]));
  let prev = "";
  const rows = bands.map(([g, name, lo, hi, k, c]) => {
    const head = g !== prev; const first = !prev; prev = g;
    return `${head ? `<div class="wl-group${first ? "" : " sep"}">${g}</div>` : ""}<div class="wl-row" data-tip="${esc(`<b>${name} · ${lo}–${hi} nm</b><br>${c} étude(s)`)}"><i class="wl-${k} wl-chip"></i><span><b>${name}</b> <small class="mono">${hi > 1100 ? "≥ " + lo : lo + "–" + hi}</small></span><span class="wl-bar"><i class="wl-${k}" style="width:${Math.max(c ? 2 : 0, 100 * c / max)}%"></i><b>${c}</b></span></div>`;
  }).join("");
  return `<div class="wl">
    <p class="wl-sub">${withNm.length} études précisent leur longueur d'onde · une étude peut en tester plusieurs</p>
    <div class="wl-label">Les plus utilisées</div>
    <div class="wl-top">${top.map(([nm, c]) => `<span class="wl-${wlClass(nm)}" data-tip="${esc(`<b>${nm} nm</b> · ${c} étude(s)<br>${withNm.filter((a) => a.nm.map(Math.round).includes(nm)).slice(0, 6).map((a) => `${a.journal_abbr} ${a.year}`).join("<br>")}`)}"><b class="mono">${nm}</b> nm · ${c}</span>`).join("")}</div>
    <div class="wl-label sep">Par bande</div>${rows}</div>`;
}

const EFF_GLYPH = {
  favorable: '<path d="M5 9.2l2.6 2.6L13 6.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  "mitigé": '<path d="M4.5 10c1.5-2 3-2 4.5 0s3 2 4.5 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  neutre: '<path d="M5 7.3h8M5 10.7h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  "défavorable": '<path d="M6 6l6 6M12 6l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};
const EFF_CLS = { favorable: "fav", "mitigé": "mit", neutre: "neu", "défavorable": "def" };
function effPeriod(y, last) {
  if (y > last - 3) return String(y);
  if (y >= 2020) return last - 3 > 2020 ? `2020–${last - 3}` : "2020";
  if (y >= 2015) return "2015–2019";
  if (y >= 2010) return "2010–2014";
  return `${Math.floor(y / 10) * 10}–${Math.floor(y / 10) * 10 + 9}`;
}
function chartEffects(list) {
  const keys = Object.keys(EFFECTS);
  const xs0 = list.filter((a) => EFFECTS[a.effect]);
  if (!xs0.length) return `<div class="empty small">Graphique disponible quand des fiches auront été rédigées pour ce thème.</div>`;
  const last = Math.max(...xs0.map((a) => a.year));
  const span = last - Math.min(...xs0.map((a) => a.year));
  const per = (y) => (span > 6 ? effPeriod(y, last) : String(y));
  const labels = [...new Set(xs0.map((a) => a.year).sort((a, b) => a - b).map(per))];
  const rows = labels.map((p) => { const xs = xs0.filter((a) => per(a.year) === p); return { p, n: xs.length, by: keys.map((k) => xs.filter((a) => a.effect === k).length) }; });
  const legend = `<div class="eff-legend">${keys.map((k) => `<span class="eff-chip eff-${EFF_CLS[k]}"><svg viewBox="0 0 18 18" aria-hidden="true"><rect width="18" height="18" rx="5"/>${EFF_GLYPH[k]}</svg>${EFFECTS[k][0]}</span>`).join("")}</div>`;
  return `<div class="effchart">${legend}
    <div class="eff-row eff-head"><span>Période</span><span>Répartition des études</span><span>Favorable</span></div>
    ${rows.map((r) => `<div class="eff-row"><span class="eff-p"><b class="mono">${r.p}</b><small>${r.n} étude${r.n > 1 ? "s" : ""}</small></span>
      <span class="eff-bar">${r.by.map((c, i) => c ? `<span class="eff-${EFF_CLS[keys[i]]}" style="flex:${c} 1 0" data-tip="${esc(`<b>${r.p} · ${EFFECTS[keys[i]][0]}</b><br>${c} sur ${r.n} (${Math.round(100 * c / r.n)} %)`)}">${c / r.n >= 0.08 ? c : ""}</span>` : "").join("")}</span>
      <b class="eff-pct">${Math.round(100 * r.by[0] / r.n)} %</b></div>`).join("")}
    <p class="muted" style="font-size:.8rem;margin:4px 0 0">Les chiffres dans les barres sont des nombres d'études${span > 6 ? " ; les années anciennes sont regroupées" : ""}. Seules les études qui mesurent un effet clinique ou biologique sont comptées (hors revues sans conclusion, protocoles et lettres).</p></div>`;
}

/* ---------------- vues ---------------- */
const app = () => $("#app");
const NAV_LABEL = { accueil: "Tableau de bord", publications: "Publications", syntheses: "Synthèses", comparer: "Comparateur", essais: "Études en cours", appareils: "Appareils", parametres: "Paramètres", patients: "Fiches patients", alertes: "Alertes par mail", brouillons: "Brouillons", methode: "Méthode" };
function setNav(id) {
  $$("[data-nav]").forEach((a) => a.setAttribute("aria-current", a.dataset.nav === id ? "page" : "false"));
  const c = $("#crumb"); if (c) c.innerHTML = `${esc(topic().label)} <span aria-hidden="true">/</span> <b>${NAV_LABEL[id] || ""}</b>`;
}
const SUB_ICON = {
  accueil: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  publications: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/>',
  syntheses: '<path d="M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4zM20 5h-4a3 3 0 0 0-3 3"/><path d="M20 5v13h-6"/>',
  essais: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 15h9"/>' };
const kfmt = (n) => n >= 1000 ? (n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " k" : String(n ?? "");
function renderTopics() {
  const box = $("#side-topics"); if (!box) return;
  const sub = [["accueil", "Tableau de bord"], ["publications", "Publications"], ["syntheses", "Synthèses"], ["essais", "Études en cours"]];
  const cur = decodeURIComponent(location.hash.slice(1)).split("-")[0];
  const q = ($("#side-find")?.value || "").trim().toLowerCase();
  const norm = (x) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const tile = (t) => `<span class="tile" aria-hidden="true">${esc(t.abbr || t.label.slice(0, 2))}</span>`;
  box.innerHTML = D.topics.map((t) => { const n = t.n ?? 0; const on = t.id === state.topic && !isSoon(t);
    const name = t.nav || t.short || t.label;
    if (!on && q && !norm(t.label + " " + name).includes(norm(q))) return "";
    if (!on) return `<button type="button" class="tp" data-topic="${t.id}" aria-pressed="false" title="${esc(t.label)}" style="--tc:${t.color || "var(--accent)"}">${tile(t)}<span class="tp-l">${esc(name)}</span>${isSoon(t) ? '<span class="soon">À venir</span>' : `<span class="count">${kfmt(n)}</span>`}</button>`;
    const tr = t.trials ? t.trials.now + t.trials.soon : 0;
    return `<div class="tp-card" style="--tc:${t.color || "var(--accent)"}"><button type="button" class="tp on" data-topic="${t.id}" aria-pressed="true" title="${esc(t.label)}">${tile(t)}<span class="tp-l">${esc(name)}</span><svg class="chev" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button>
      <div class="side-sub">${sub.map(([k, l]) => `<a class="sub" href="#${k}" data-nav="${k}" aria-current="${cur === k || (k === "accueil" && (!cur || cur === "article")) ? "page" : "false"}"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">${SUB_ICON[k]}</svg><span>${l}</span>${k === "publications" ? `<span class="count">${kfmt(n)}</span>` : k === "essais" && tr ? `<span class="count">${tr}</span>` : ""}</a>`).join("")}</div></div>`; }).join("") || `<p class="muted" style="padding:8px 10px;font-size:.85rem">Aucune spécialité ne correspond.</p>`;
  $("#topic").innerHTML = D.topics.map((t) => `<option value="${t.id}" ${t.id === state.topic ? "selected" : ""}>${esc(t.short || t.label)}${isSoon(t) ? " · à venir" : ""}</option>`).join("");
  const up = $("#side-update"); if (up) up.textContent = `Mis à jour le ${fmtDate(D.generated)}`;
}
function setTopic(id) {
  state.topic = id; store.set("topic", id); INDEX.clear(); state.cmp = null; state.synTab = "global"; state.essCtx = ""; state.essReg = ""; state.cardLevel.clear();
  for (const k in state.f) state.f[k] = state.f[k] instanceof Set ? new Set() : (typeof state.f[k] === "boolean" ? false : "");
  renderTopics(); route(); scrollTo(0, 0);
}
function viewSoon(id) {
  setNav(id); const t = topic(); const actives = D.topics.filter((x) => !isSoon(x));
  app().innerHTML = `<div class="view"><section class="soon-hero">
    <span class="soon-badge"><i></i>Thème à venir</span>
    <h1>${esc(t.label)}</h1>
    <p class="muted" style="max-width:56ch;font-size:1.02rem">${esc(t.description || "")}</p>
    <p class="muted" style="max-width:56ch">Ce thème suivra le même principe que les autres : revue de la littérature sur plusieurs années, fiches en trois niveaux de lecture, niveaux de preuve, synthèses annuelles et étude comparative, puis veille hebdomadaire.</p>
    <div class="chips" style="justify-content:center">${actives.map((x) => `<button class="chip" data-topic="${x.id}">Voir ${esc(x.label)}</button>`).join("")}</div>
  </section></div>`;
}

function viewHome() {
  setNav("accueil");
  const list = all(); const t = topic(); const g = D.syntheses[state.topic]?.global;
  const lastWeek = [...new Set(list.map((a) => a.week))].sort().pop();
  const latest = list.filter((a) => a.week === lastWeek || a.date >= iso(new Date(Date.now() - 21 * 864e5))).slice(0, 4);
  const keys = list.filter((a) => a.key && a.level && a.level <= 2 && !latest.includes(a)).slice(0, 5);
  const rct = list.filter((a) => a.type === "rct").length; const syn = list.filter((a) => groupOf(a) === "syn").length;
  const synBody = !g ? "" : state.level === 1 ? `<p>${esc(g.l1)}</p>` : state.level === 2 ? paras(g.l2) : g.l3.map((s) => `<h4>${esc(s.h)}</h4><p>${esc(s.p)}</p>`).join("");
  app().innerHTML = `<div class="view">
  <section class="hero">
    <div class="hero-text">
      <span class="eyebrow">Veille photobiomodulation · ${esc(t.label)}</span>
      <h1>Ce que la recherche a publié sur la <em>PBM et ${esc(t.hero || t.label.toLowerCase())}</em> depuis ${esc((t.since || "2024").slice(0, 4))}</h1>
      <p class="lead">${list.length} publications PubMed analysées une par une, chacune lisible en trois niveaux, avec son niveau de preuve et, quand l'article est en accès libre, le PDF intégré.</p>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="eyebrow">Niveau de lecture</span>${levelSwitch(state.level)}</div>
      <div class="syn-card">
        <div class="panel-head" style="margin:0"><div style="display:grid;gap:6px"><span class="eyebrow">Synthèse ${esc((t.since || "2024").slice(0, 4))} → aujourd'hui</span><h3 style="font-size:1.08rem">${esc(g?.headline || "Synthèse")}</h3></div><a href="#syntheses" class="btn small">Toutes les synthèses</a></div>
        <div class="prose ${state.level === 1 ? "l1" : ""}">${synBody}</div>
      </div>
    </div>
    <div style="display:grid;gap:16px">
      <div class="kpis">
        <div class="kpi"><b>${list.length.toLocaleString("fr-FR")}</b><span>notices indexées, de ${yearsOf(list)[0]} à ${yearsOf(list).slice(-1)[0]}</span></div>
        <div class="kpi"><b>${list.filter((a) => a.curated !== false).length}</b><span>fiches rédigées en 3 niveaux</span></div>
        <div class="kpi"><b>${rct}</b><span>essais randomisés</span></div>
        <div class="kpi"><b>${syn}</b><span>revues systématiques, méta-analyses et recommandations</span></div>
        <div class="kpi"><b>${list.filter((a) => a.pdf).length}</b><span>PDF en accès libre lisibles sur le site</span></div>
      </div>
      <div class="panel"><div class="panel-head"><h3>Niveaux de preuve</h3><a class="btn small" href="#methode">Comprendre</a></div>${chartPyramid(list)}</div>
      ${t.trials && t.trials.now + t.trials.soon ? `<a class="panel ess-teaser" href="#essais"><span class="eyebrow">Études en cours</span><span><b>${t.trials.now}</b> essais en cours · <b>${t.trials.soon}</b> projets en construction</span><span class="muted">Promoteurs, investigateurs et pays, d'après ClinicalTrials.gov et les registres de l'OMS →</span></a>` : ""}
      <p class="muted" style="font-size:.78rem">Dernière mise à jour : <span class="mono">${fmtDate(D.generated)}</span> · veille ${esc(t.cadence)} · PubMed + Europe PMC</p>
    </div>
  </section>

  ${t.subgroups ? `<section class="panel"><div class="panel-head"><h2>Sous-groupes</h2><p>Cliquez pour voir les publications du sous-groupe</p></div><div class="grid-3">${t.subgroups.map((g) => { const xs = list.filter((a) => (a.ctx || []).includes(g));
      return `<button type="button" class="card" data-sub="${g}" style="text-align:left;cursor:pointer;font:inherit;color:inherit"><span class="eyebrow">${xs.length} publications · ${xs.filter((a) => a.type === "rct").length} ECR · ${xs.filter((a) => groupOf(a) === "syn").length} synthèses</span><h3>${esc(CTX[g])}</h3><span class="muted" style="font-size:.85rem">${esc(SUB_DESC[g] || "")}</span><span class="badges">${Object.keys(EFFECTS).map((k) => { const n = xs.filter((a) => a.effect === k).length; return n ? `<span class="eff" data-e="${k}">${EFF_ICON[k]}${n}</span>` : ""; }).join("")}</span></button>`; }).join("")}</div></section>` : ""}
  <section class="grid-2">
    <div class="panel"><div class="panel-head"><h2>Dernières parutions</h2><a class="btn small" href="#publications">Tout voir</a></div><div style="display:grid;gap:10px">${latest.map((a) => card(a, { noSel: true })).join("")}</div></div>
    <div class="panel"><div class="panel-head"><h2>À retenir</h2><p>Les essais et synthèses les plus solides</p></div><div style="display:grid;gap:10px">${keys.map((a) => card(a, { noSel: true })).join("")}</div></div>
  </section>

  <section class="panel"><div class="panel-head"><h2>Rythme de publication</h2><p>Publications selon le type d'étude (par an au-delà de 6 ans)</p></div>${chartMonthly(list)}</section>
  <section class="grid-2">
    <div class="panel"><div class="panel-head"><h2>Méta-analyses : taille de l'effet</h2></div>${chartForest(list)}</div>
    <div class="panel"><div class="panel-head"><h2>Essais : bras par bras</h2><p>Taux d'événements rapportés</p></div>${chartDumbbell(list)}</div>
  </section>
  <section class="grid-2">
    <div class="panel"><div class="panel-head"><h2>Longueurs d'onde étudiées</h2><p>Fiches rédigées</p></div>${chartSpectrum(list)}</div>
    <div class="panel"><div class="panel-head"><h2>Sens des résultats</h2><p>Par période · fiches rédigées</p></div>${chartEffects(list)}</div>
  </section></div>`;
}

function filterGroup(title, key, entries, fmt) {
  if (!entries.length) return "";
  return `<div class="fgroup"><span class="eyebrow">${title}</span><div class="chips">${entries.map(([v, n]) =>
    `<button type="button" class="chip" data-f="${key}" data-v="${esc(v)}" aria-pressed="${state.f[key].has(v)}">${esc(fmt ? fmt(v) : v)}<span class="n">${n}</span></button>`).join("")}</div></div>`;
}
function viewPubs() {
  setNav("publications");
  const base = all(); const list = filtered(base);
  const weeks = [...countBy(base, (a) => a.week).entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const active = state.q || Object.values(state.f).some((v) => v instanceof Set ? v.size : v);
  const groupsHtml = (() => {
    if (!list.length) return `<div class="empty">Aucune publication ne correspond. Essayez un autre mot-clé ou <button class="btn small" data-reset>réinitialisez les filtres</button>.</div>`;
    const shown = list.slice(0, state.limit);
    const more = list.length > shown.length ? `<div style="display:flex;justify-content:center;margin-top:20px"><button class="btn" data-morelist>Afficher ${Math.min(120, list.length - shown.length)} de plus <span class="muted">(${shown.length} sur ${list.length})</span></button></div>` : "";
    if (state.sort !== "date") return `<div style="display:grid;gap:10px">${shown.map((a) => card(a)).join("")}</div>${more}`;
    const wk = new Map(); shown.forEach((a) => { if (!wk.has(a.week)) wk.set(a.week, []); wk.get(a.week).push(a); });
    return [...wk.entries()].map(([k, xs]) => `<section class="week-group"><div class="week-label"><span class="mono">${k.replace("-S", " · semaine ")}</span><span>${weekLabel(k)}</span><span class="muted">${xs.length} publication${xs.length > 1 ? "s" : ""}</span></div>${xs.map((a) => card(a)).join("")}</section>`).join("") + more;
  })();
  const ord = (m, order) => [...m.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  app().innerHTML = `<div class="pubs-layout">
    <aside class="filters panel" data-collapsed="${innerWidth < 900 && !state.filtersOpen}" aria-label="Filtres">
      <div class="panel-head" style="margin:0"><h3>Filtres</h3><button class="btn small" data-reset ${active ? "" : "disabled"}>Réinitialiser</button></div>
      <button class="btn small" data-togglefilters style="display:${innerWidth < 900 ? "inline-flex" : "none"}">Afficher / masquer les filtres${active ? " (actifs)" : ""}</button>
      <div class="fgroup"><span class="eyebrow">Période</span>
        <div class="chips">${[["7j", "7 derniers jours"], ["30j", "30 derniers jours"], ["2026", "2026"], ["2025", "2025"], ["2024", "2024"]].map(([k, l]) => `<button type="button" class="chip" data-preset="${k}">${l}</button>`).join("")}</div>
        <div class="dates"><label class="muted" style="font-size:.75rem">Du<input type="date" id="f-from" value="${state.f.from}"></label><label class="muted" style="font-size:.75rem">Au<input type="date" id="f-to" value="${state.f.to}"></label></div>
        <select id="f-week" aria-label="Aller à une semaine"><option value="">Choisir une semaine…</option>${weeks.map(([k, n]) => `<option value="${k}">${k.replace("-S", " · S")} (${weekLabel(k)}) · ${n}</option>`).join("")}</select>
      </div>
      ${filterGroup("Fiche", "fiche", [...countBy(base, (a) => a.curated === false ? "indexée" : "rédigée").entries()].sort(), (v) => v === "rédigée" ? "Fiche rédigée (3 niveaux)" : "Notice indexée")}
      ${filterGroup("Année", "years", [...countBy(base, (a) => a.year).entries()].sort((a, b) => b[0] - a[0]))}
      ${filterGroup("Type d'étude", "groups", ord(countBy(base, groupOf), GROUPS.map((g) => g.id)), (v) => GROUPS.find((g) => g.id === v).label)}
      ${filterGroup("Niveau de preuve", "levels", ord(countBy(base, (a) => a.level), [1, 2, 3, 4, 5, 0]), (v) => v ? `${v} · ${LEVELS[v][0]}` : "Non gradé")}
      ${filterGroup("Résultat", "effects", ord(countBy(base.filter((a) => EFFECTS[a.effect]), (a) => a.effect), Object.keys(EFFECTS)), (v) => EFFECTS[v][0])}
      ${filterGroup(topic().subgroups ? "Sous-groupe" : "Contexte", "ctx", [...countBy(base, (a) => a.ctx || []).entries()].sort((a, b) => b[1] - a[1]), (v) => CTX[v] || v)}
      ${filterGroup("Population", "pops", [...countBy(base.filter((a) => a.pop !== "—"), (a) => a.pop).entries()])}
      ${filterGroup("Thème", "themes", [...countBy(base, (a) => a.theme).entries()].sort((a, b) => b[1] - a[1]))}
      <div class="fgroup"><label class="check"><input type="checkbox" id="f-pdf" ${state.f.pdf ? "checked" : ""}> PDF disponible sur le site</label><label class="check"><input type="checkbox" id="f-key" ${state.f.key ? "checked" : ""}> Seulement « À retenir »</label></div>
    </aside>
    <section style="min-width:0">
      <div class="results-head"><span class="count"><b>${list.length}</b> publication${list.length > 1 ? "s" : ""}${state.q ? ` pour « ${esc(state.q)} »` : ""}</span>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${levelSwitch(state.level)}
        <label class="muted" style="font:500 .8rem var(--f-display)">Trier <select id="sort" style="border:1px solid var(--line);border-radius:8px;padding:5px;background:var(--surface)">
          ${[["date", "Plus récentes"], ["pertinence", "Pertinence"], ["preuve", "Niveau de preuve"], ["effectif", "Effectif"]].map(([v, l]) => `<option value="${v}" ${state.sort === v ? "selected" : ""}>${l}</option>`).join("")}</select></label></div></div>
      ${groupsHtml}
    </section></div>`;
}

async function viewArticleRaw(a) {
  const links = [a.doi && [`https://doi.org/${a.doi}`, "Article original (DOI)"], [`https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`, "PubMed"],
    a.pmcid && [`https://pmc.ncbi.nlm.nih.gov/articles/${a.pmcid}/`, "PMC (texte intégral)"], [`https://europepmc.org/article/MED/${a.pmid}`, "Europe PMC"]].filter(Boolean);
  app().innerHTML = `<div class="article"><div style="display:grid;gap:22px;min-width:0">
    <a href="#publications" class="btn small" style="justify-self:start">← Publications</a>
    <header><div class="badges"><span class="badge raw-badge">Non analysé</span>${typeBadge(a)}${lvlBadge(a)}</div>
      <h1 lang="en" style="font-size:clamp(1.3rem,1.05rem + 1.2vw,1.9rem)">${esc(a.title)}</h1>
      <p class="src muted" style="font:500 .85rem var(--f-display)">${esc((a.authors || []).join(", "))} · <i>${esc(a.journal)}</i><br>${metaLine(a)}</p></header>
    <div class="callout">Cette notice est indexée mais n'a pas encore de fiche en trois niveaux. Le type d'étude, le niveau de preuve et le sous-groupe sont détectés automatiquement à partir de PubMed et peuvent être imprécis.</div>
    <section class="panel"><h3 style="margin-bottom:10px">Résumé des auteurs (PubMed, en anglais)</h3><div class="abstract" id="raw-abs" lang="en"><p class="muted">Chargement du résumé…</p></div></section>
    </div><aside style="display:grid;gap:18px;min-width:0"><div class="panel"><h3 style="margin-bottom:6px">Fiche technique</h3><dl class="facts">
      ${[["Type (auto)", typeLabel(a)], ["Niveau (indicatif)", a.level ? `${a.level} · ${LEVELS[a.level][0]}` : "Non gradé"], ["Sous-groupe (auto)", (a.ctx || []).map((c) => CTX[c] || c).join(", ") || "—"], ["Mise en ligne", fmtDate(a.date)], ["PMID", a.pmid], ["Types PubMed", (a.pub_types || []).join(", ") || "—"]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></div>
      <div class="panel"><h3 style="margin-bottom:10px">Sources</h3><div class="links">${links.map(([h, l]) => `<a class="btn small" href="${h}" target="_blank" rel="noopener">${l} ↗</a>`).join("")}</div></div></aside></div>`;
  scrollTo(0, 0);
  const ab = await abstractOf(a); const box = $("#raw-abs");
  if (box) box.innerHTML = ab.length ? ab.map((x) => `<p>${x.label ? `<b>${esc(x.label)}</b> ` : ""}${esc(x.text)}</p>`).join("") : `<p class="muted">Résumé indisponible ici. <a href="https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/" target="_blank" rel="noopener">Voir sur PubMed</a>.</p>`;
}
function viewArticle(pmid) {
  setNav("publications");
  const a = byId(pmid);
  if (!a) { app().innerHTML = `<div class="empty">Publication introuvable (PMID ${esc(pmid)}). <a href="#publications">Retour aux publications</a></div>`; return; }
  if (a.curated === false) return viewArticleRaw(a);
  const lv = state.cardLevel.get(pmid) || state.level;
  const related = all().filter((x) => x.pmid !== a.pmid && x.theme === a.theme).slice(0, 4);
  const body = lv === 1 ? `<div class="prose l1"><p>${esc(a.l1)}</p></div>`
    : lv === 2 ? `<div class="prose">${paras(a.l2)}</div>`
    : `<div class="prose">${paras(a.l2)}${l3Html(a)}</div>
       <details ${a.abstract?.length ? "" : "hidden"} open><summary style="cursor:pointer;font:600 .9rem var(--f-display);margin:8px 0">Résumé original (PubMed, en anglais)</summary>
       <div class="abstract">${(a.abstract || []).map((x) => `<p>${x.label ? `<b>${esc(x.label)}</b> ` : ""}${esc(x.text)}</p>`).join("")}</div></details>`;
  const links = [
    a.doi && [`https://doi.org/${a.doi}`, "Article original (DOI)"],
    [`https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`, "PubMed"],
    a.pmcid && [`https://pmc.ncbi.nlm.nih.gov/articles/${a.pmcid}/`, "PMC (texte intégral)"],
    [`https://europepmc.org/article/MED/${a.pmid}`, "Europe PMC"],
  ].filter(Boolean);
  app().innerHTML = `<div class="article">
    <div style="display:grid;gap:22px;min-width:0">
      <a href="#publications" class="btn small" style="justify-self:start">← Publications</a>
      <header>
        <div class="badges">${typeBadge(a)}${lvlBadge(a)}${effBadge(a)}${a.key ? '<span class="star">★ À retenir</span>' : ""}</div>
        <h1 style="font-size:clamp(1.4rem,1.1rem + 1.4vw,2.1rem)">${esc(a.title_fr)}</h1>
        <p class="orig">${esc(a.title)}</p>
        <p class="src muted" style="font:500 .85rem var(--f-display)">${esc((a.authors || []).join(", "))} · <i>${esc(a.journal)}</i><br>${metaLine(a)}</p>
      </header>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">${levelSwitch(lv, "data-aread")}<button class="btn small" data-cite="${a.pmid}">Copier la référence</button></div>
      <section class="panel">${body}</section>
      ${a.metric?.kind === "rates" ? `<section class="panel"><h3 style="margin-bottom:8px">Résultat principal</h3>${chartDumbbell([a])}</section>` : ""}
      ${a.metric?.kind === "rr" ? `<section class="panel"><h3 style="margin-bottom:8px">Estimation poolée</h3>${chartForest([a])}</section>` : ""}
      ${a.metric?.kind === "values" ? `<section class="panel"><h3 style="margin-bottom:8px">Résultat principal · ${esc(a.metric.outcome)}</h3>${barsValues(a)}</section>` : ""}
      <section class="reader" id="reader">${a.pdf ? `<div class="reader-bar"><b>Texte intégral (PDF)</b><span class="muted">licence ${esc((a.license || "").toUpperCase())} · PMC Open Access</span><span style="flex:1"></span>
        <button class="btn small" data-zoom="-1" aria-label="Réduire">−</button><button class="btn small" data-zoom="1" aria-label="Agrandir">+</button><a class="btn small" href="${a.pdf}" target="_blank" rel="noopener">Ouvrir le PDF</a></div>
        <div class="reader-pages" id="pages"><p class="muted">Chargement du PDF…</p></div>`
      : `<div class="reader-bar"><b>Texte intégral</b><span class="muted">${a.oa ? "Accès libre chez l'éditeur" : "Non disponible en accès libre : consulter la source originale"}</span></div><div style="padding:14px" class="links">${links.map(([h, l]) => `<a class="btn" href="${h}" target="_blank" rel="noopener">${l} ↗</a>`).join("")}</div>`}</section>
    </div>
    <aside style="display:grid;gap:18px;min-width:0">
      <div class="panel"><h3 style="margin-bottom:6px">Fiche technique</h3><dl class="facts">
        ${[["Type", typeLabel(a)], ["Niveau de preuve", a.level ? `${a.level} · ${LEVELS[a.level][0]}` : "Non gradé"], ["Population", a.pop], ["Contexte", (a.ctx || []).map((c) => CTX[c] || c).join(", ") || "—"],
          ["Objectif", a.aim], ["Modalité", (a.mode || []).join(", ") || "—"], ["Longueurs d'onde", a.nm?.length ? a.nm.join(" / ") + " nm" : "non précisé"], ["Effectif", a.n ? `${a.n} ${a.type === "preclinical" ? "(animaux/unités)" : "patients"}` : "—"],
          ["Thème", a.theme], ["Mise en ligne", fmtDate(a.date) + " · " + a.week.replace("-S", " S")], ["PMID", a.pmid], ["Citations", String(a.cited_by ?? 0) + " (Europe PMC)"]]
          .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></div>
      <div class="panel"><h3 style="margin-bottom:10px">Sources</h3><div class="links">${links.map(([h, l]) => `<a class="btn small" href="${h}" target="_blank" rel="noopener">${l} ↗</a>`).join("")}</div></div>
      ${related.length ? `<div class="panel"><h3 style="margin-bottom:10px">Même thème · ${esc(a.theme)}</h3><div style="display:grid;gap:10px">${related.map((r) => `<a href="#article-${r.pmid}" style="text-decoration:none;color:var(--ink);display:grid;gap:4px"><span style="font:600 .9rem/1.3 var(--f-display)">${esc(r.title_fr)}</span><span class="muted" style="font:500 .75rem var(--f-display)">${typeLabel(r)} · ${r.year}</span></a>`).join("")}</div></div>` : ""}
    </aside></div>`;
  if (a.pdf) renderPdf(a.pdf);
  scrollTo(0, 0);
}
function barsValues(a) {
  const m = a.metric; const max = Math.max(m.a, m.b) * 1.1;
  return `<div class="bars-h">${[[m.a_label, m.a, "var(--s1)"], [m.b_label, m.b, "var(--s2)"]].map(([l, v, c]) => `<div class="row"><span>${esc(l)}</span><div class="bar" style="width:${100 * v / max}%;background:${c};height:14px"></div><span class="vals">${String(v).replace(".", ",")} ${esc(m.unit || "")}</span></div>`).join("")}</div>`;
}

/* lecteur PDF : PDF.js en mode « fil principal » (compatible hébergement statique) */
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
const loadScript = (src) => new Promise((ok, ko) => { if ($(`script[src="${src}"]`)) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
let pdfZoom = 1.3;
async function renderPdf(url) {
  const box = $("#pages"); if (!box) return;
  try {
    await loadScript(PDFJS + "pdf.worker.min.js"); await loadScript(PDFJS + "pdf.min.js");
    const doc = await window.pdfjsLib.getDocument({ url }).promise;
    if (!$("#pages")) return;
    box.innerHTML = `<p class="muted mono" style="font-size:.75rem">${doc.numPages} page(s)</p>`;
    const io = new IntersectionObserver((ents) => ents.forEach(async (e) => {
      if (!e.isIntersecting || e.target.dataset.done) return; e.target.dataset.done = 1; io.unobserve(e.target);
      const page = await doc.getPage(+e.target.dataset.p); const vp = page.getViewport({ scale: pdfZoom * (devicePixelRatio > 1 ? 1.5 : 1) });
      e.target.width = vp.width; e.target.height = vp.height; e.target.style.width = vp.width / (devicePixelRatio > 1 ? 1.5 : 1) + "px";
      await page.render({ canvasContext: e.target.getContext("2d"), viewport: vp }).promise;
    }), { root: box, rootMargin: "600px" });
    for (let p = 1; p <= doc.numPages; p++) { const c = document.createElement("canvas"); c.dataset.p = p; c.width = 600; c.height = 800; c.setAttribute("aria-label", `Page ${p}`); box.appendChild(c); io.observe(c); }
  } catch (err) {
    box.innerHTML = `<div class="empty" style="max-width:520px">Le lecteur intégré n'a pas pu charger ce PDF ici (site ouvert directement depuis le disque, ou réseau indisponible). <a href="${url}" target="_blank" rel="noopener">Ouvrir le PDF</a> ou lancer le site avec un petit serveur local (voir le README).</div>`;
  }
}

function viewSyntheses() {
  setNav("syntheses");
  const S = D.syntheses[state.topic] || {}; const tabs = [["global", "Étude comparative"], ...Object.keys(S.years || {}).sort().reverse().map((y) => [y, "Bilan " + y])];
  const cur = state.synTab === "global" ? S.global : S.years?.[state.synTab];
  const inTab = (a, k) => { if (k === "global") return true; const m = String(k).match(/^(\d{4})\s*[–-]\s*(\d{4})$/); return m ? a.year >= +m[1] && a.year <= +m[2] : String(a.year) === String(k); };
  const yearList = all().filter((a) => inTab(a, state.synTab));
  const body = !cur ? "" : state.level === 1 ? `<div class="prose l1"><p>${esc(cur.l1)}</p></div>` : state.level === 2 ? `<div class="prose">${paras(cur.l2)}</div>` : `<div class="prose">${cur.l3.map((s) => `<h4>${esc(s.h)}</h4><p>${esc(s.p)}</p>`).join("")}</div>`;
  const tbl = state.synTab === "global" && S.global?.table ? `<section class="panel"><div class="panel-head"><h2>Tableau comparatif</h2><p>Les faits marquants de chaque année, côte à côte</p></div><div class="cmp-table"><table><thead><tr><th></th>${S.global.table.cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${S.global.table.rows.map((r) => `<tr><th>${esc(r.label)}</th>${r.cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>` : "";
  const periods = [...new Set(yearsOf(all()).map((y) => (y < 2020 ? `${Math.floor(y / 10) * 10}–${Math.floor(y / 10) * 10 + 9}` : String(y))))];
  const counts = (y) => { const xs = all().filter((a) => inTab(a, y)); return [xs.length, xs.filter((a) => a.type === "rct").length, xs.filter((a) => groupOf(a) === "syn").length, xs.filter((a) => a.level && a.level <= 2).length, xs.filter((a) => a.effect === "favorable").length]; };
  const stats = state.synTab === "global" ? `<section class="panel"><div class="panel-head"><h2>La période en chiffres</h2></div><div class="cmp-table"><table><thead><tr><th></th>${periods.map((y) => `<th style="text-align:right">${y}</th>`).join("")}</tr></thead><tbody>
      ${["Publications", "Essais randomisés", "Synthèses systématiques", "Niveau de preuve 1–2", "Résultat favorable"].map((l, i) => `<tr><th>${l}</th>${periods.map((y) => `<td class="num">${counts(y)[i]}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>` : "";
  app().innerHTML = `<div class="view">
    <div style="display:grid;gap:14px"><span class="eyebrow">Synthèses · ${esc(topic().label)}</span><h1>Bilans annuels et étude comparative</h1>
      <div class="syn-tabs">${tabs.map(([k, l]) => `<button class="chip" data-syn="${k}" aria-pressed="${state.synTab === k}">${l}</button>`).join("")}</div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="eyebrow">Niveau de lecture</span>${levelSwitch(state.level)}</div></div>
    <section class="panel syn-body"><h2>${esc(cur?.headline || "")}</h2>${body}
      <p class="muted" style="font-size:.85rem">Rédigé à partir des ${yearList.filter((a) => a.curated !== false).length} fiches rédigées de la période (${yearList.length} notices indexées). Pour un autre découpage (semaines, trimestres, sélection d'articles), utilisez le <a href="#comparer">comparateur</a>.</p></section>
    ${tbl}${stats}
    <section class="grid-2"><div class="panel"><div class="panel-head"><h2>Méta-analyses de la période</h2></div>${chartForest(yearList)}</div>
      <div class="panel"><div class="panel-head"><h2>Essais de la période</h2></div>${chartDumbbell(yearList)}</div></section>
  </div>`;
}


/* ---------------- études en cours & projets en construction (ClinicalTrials.gov + registres de l'OMS) ---------------- */
const TRIAL_STATUS = { RECRUITING: ["Recrutement ouvert", "rec"], ENROLLING_BY_INVITATION: ["Inclusion sur invitation", "inv"],
  ACTIVE_NOT_RECRUITING: ["En cours, inclusions closes", "act"], NOT_YET_RECRUITING: ["Pas encore ouvert", "soon"] };
const SPONSOR_CLASS = { OTHER: "Académique ou hospitalier", INDUSTRY: "Industriel", NIH: "NIH (États-Unis)", FED: "Agence fédérale", OTHER_GOV: "Organisme public", NETWORK: "Réseau de recherche", INDIV: "Investigateur", UNKNOWN: "—" };
const PHASE = { NA: "Sans phase (dispositif)", EARLY_PHASE1: "Phase 1 précoce", PHASE1: "Phase 1", PHASE2: "Phase 2", PHASE3: "Phase 3", PHASE4: "Phase 4" };
const MASK = { NONE: "ouvert", SINGLE: "simple aveugle", DOUBLE: "double aveugle", TRIPLE: "triple aveugle", QUADRUPLE: "quadruple aveugle" };
const COUNTRY_FR = { "Iran (Islamic Republic of)": "Iran", "Korea, Republic of": "Corée du Sud", "Viet Nam": "Viêt Nam", Thailand: "Thaïlande", "New Zealand": "Nouvelle-Zélande", "Sri Lanka": "Sri Lanka", Oman: "Oman", Nepal: "Népal", Bangladesh: "Bangladesh", "Hong Kong": "Hong Kong", "United States": "États-Unis", Brazil: "Brésil", France: "France", "Turkey (Türkiye)": "Turquie", Egypt: "Égypte", Italy: "Italie", Taiwan: "Taïwan", China: "Chine", Canada: "Canada", Pakistan: "Pakistan", Belgium: "Belgique", "United Kingdom": "Royaume-Uni", Sweden: "Suède", Australia: "Australie", Iraq: "Irak", Israel: "Israël", Jordan: "Jordanie", "Saudi Arabia": "Arabie saoudite", Chile: "Chili", Indonesia: "Indonésie", Czechia: "Tchéquie", Romania: "Roumanie", Portugal: "Portugal", Poland: "Pologne", Syria: "Syrie", Lebanon: "Liban", "South Korea": "Corée du Sud", Switzerland: "Suisse", Slovenia: "Slovénie", Russia: "Russie", "Puerto Rico": "Porto Rico", Germany: "Allemagne", Spain: "Espagne", Netherlands: "Pays-Bas", Denmark: "Danemark", India: "Inde", Iran: "Iran", Japan: "Japon", Mexico: "Mexique" };
const fr = (c) => COUNTRY_FR[c] || c;
const ymFR = (d) => { if (!d) return "—"; const [y, m] = d.split("-"); return m ? `${["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."][+m - 1]} ${y}` : y; };
async function ensureTrials() { if (!window.LUMINA_E && D.trials_file) await loadScript(D.trials_file); return window.LUMINA_E?.by_topic?.[state.topic] || []; }
const shortAff = (a) => { const x = (a || "").split(/[;,]\s*/)[0].trim(); return x.length > 90 ? x.slice(0, 88) + "…" : x; };
const leadOf = (s) => s.officials?.find((o) => /PRINCIPAL|CHAIR|DIRECTOR/.test(o.role || "")) || s.officials?.[0] || s.responsible;
function trialCard(s) {
  const [stl, stc] = TRIAL_STATUS[s.status] || [s.status, ""]; const lead = leadOf(s);
  const ct = !s.registry || s.registry === "ClinicalTrials.gov";
  const design = [s.allocation === "RANDOMIZED" ? "randomisé" : s.allocation === "NON_RANDOMIZED" ? "non randomisé" : s.type === "OBSERVATIONAL" ? "observationnel" : ct ? "un seul bras" : "", MASK[s.masking]].filter(Boolean).join(", ") || "non précisé";
  const phase = (s.phases || []).map((p) => PHASE[p] || p).join(" / ");
  const sites = s.n_sites > 1 ? `${s.n_sites} centres` : s.sites?.[0]?.facility || "";
  return `<article class="card trial" data-st="${stc}">
    <div class="card-top"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="tstatus" data-st="${stc}"><i></i>${stl}</span><span class="badge">${esc(CTX[s.ctx] || s.ctx)}</span>${s.acronym ? `<span class="badge mono">${esc(s.acronym)}</span>` : ""}</div>
      <a class="btn small" href="${esc(s.url || `https://clinicaltrials.gov/study/${s.nct}`)}" target="_blank" rel="noopener" title="${esc(s.registry || "ClinicalTrials.gov")}">${ct ? "" : `<span class="muted">${esc((s.registry || "").split(" ")[0])} ·</span> `}${esc(s.nct)} ↗</a></div>
    <h3>${esc(s.titre)}</h3><p class="src" lang="en">${esc(s.title)}</p>
    <dl class="tmeta">
      <div><dt>Plan</dt><dd>${esc(design)}${phase ? ` · ${esc(phase)}` : ""}</dd></div>
      <div><dt>Participants prévus</dt><dd>${s.n ? s.n.toLocaleString("fr-FR") : "—"}</dd></div>
      <div><dt>Calendrier</dt><dd>${ymFR(s.start)} → ${ymFR(s.end)}</dd></div>
      <div><dt>Pays</dt><dd>${esc((s.countries || []).map(fr).join(", ") || "non précisé")}</dd></div>
    </dl>
    <div class="porteurs"><span class="eyebrow">Porteurs du projet</span>
      <p><b>${esc(s.sponsor || "—")}</b> <span class="muted">· promoteur${s.sponsor_class ? " " + esc((SPONSOR_CLASS[s.sponsor_class] || "").toLowerCase()) : ""}</span></p>
      ${lead?.name ? `<p>${esc(lead.name)}${lead.affiliation && shortAff(lead.affiliation) !== s.sponsor ? `, <span class="muted">${esc(shortAff(lead.affiliation))}</span>` : ""} <span class="muted">· ${lead.role === "CONTACT" ? "contact scientifique" : lead.role ? "investigateur principal" : "responsable de l'étude"}</span></p>` : ""}
      ${s.collaborators?.length ? `<p class="muted">Partenaires : ${esc(s.collaborators.join(", "))}</p>` : ""}
      ${sites ? `<p class="muted">Lieu : ${esc(sites)}${s.n_sites === 1 && s.sites[0].city ? `, ${esc(s.sites[0].city)}` : ""}</p>` : ""}</div>
    <details><summary>${ct ? "Intervention, critère principal et résumé (en anglais)" : "Intervention et critère principal (en anglais)"}</summary>
      <p><b>Intervention :</b> ${esc((s.interventions || []).map((i) => i.name).join(" · "))}</p>
      ${s.outcome ? `<p><b>Critère principal :</b> <span lang="en">${esc(s.outcome)}</span></p>` : ""}
      ${ct ? `<p lang="en" class="muted">${esc(s.summary || "")}</p>` : ""}
      <p class="muted mono" style="font-size:.72rem">${esc(s.registry || "ClinicalTrials.gov")} · déclaré le ${fmtDate(s.first_posted)} · mis à jour le ${fmtDate(s.updated)}</p></details>
  </article>`;
}
async function viewEssais() {
  setNav("essais"); const t = topic();
  app().innerHTML = `<div class="empty">Chargement du registre…</div>`;
  let xs; try { xs = await ensureTrials(); } catch { app().innerHTML = `<div class="empty">Registre indisponible. Rechargez la page.</div>`; return; }
  const q = state.essQ.toLowerCase();
  const regs = [...new Set(xs.map((s) => s.registry || "ClinicalTrials.gov"))].sort((a, b) => (b === "ClinicalTrials.gov") - (a === "ClinicalTrials.gov") || a.localeCompare(b));
  if (state.essReg && !regs.includes(state.essReg)) state.essReg = "";
  const match = (s) => (!state.essCtx || s.ctx === state.essCtx) && (!state.essReg || (s.registry || "ClinicalTrials.gov") === state.essReg) && (!q || [s.titre, s.title, s.sponsor, s.nct, s.acronym, s.registry, ...(s.countries || []), ...(s.officials || []).map((o) => o.name + " " + o.affiliation)].join(" ").toLowerCase().includes(q));
  const now = xs.filter((s) => s.status !== "NOT_YET_RECRUITING"), soon = xs.filter((s) => s.status === "NOT_YET_RECRUITING");
  const protos = all().filter((a) => a.type === "protocol" && a.date >= iso(new Date(Date.now() - 3 * 365 * 864e5)));
  const sponsors = new Map(); xs.forEach((s) => { const k = s.sponsor || "—"; const v = sponsors.get(k) || { name: k, cls: s.sponsor_class, n: 0, now: 0, soon: 0, ctx: new Set(), countries: new Set(), people: new Set(), ids: [] };
    v.n++; s.status === "NOT_YET_RECRUITING" ? v.soon++ : v.now++; v.ctx.add(s.ctx); (s.countries || []).forEach((c) => v.countries.add(fr(c))); const l = leadOf(s); if (l?.name) v.people.add(l.name); v.ids.push(s.nct); sponsors.set(k, v); });
  const ctxs = [...new Set(xs.map((s) => s.ctx))]; const tab = state.essTab;
  const list = (tab === "soon" ? soon : now).filter(match);
  const recr = now.filter((s) => s.status === "RECRUITING").length;
  const countries = new Set(xs.flatMap((s) => s.countries || [])).size;
  const fetched = window.LUMINA_E?.fetched;
  let body;
  if (tab === "porteurs") {
    const rows = [...sponsors.values()].filter((v) => (!state.essCtx || v.ctx.has(state.essCtx)) && (!q || [v.name, ...v.people, ...v.countries, ...v.ids].join(" ").toLowerCase().includes(q))).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
    body = rows.length ? `<section class="panel"><div class="panel-head"><h2>Porteurs de projets</h2><p>Promoteurs, investigateurs principaux et pays des ${xs.length} études du thème</p></div><div class="cmp-table"><table class="ptable"><thead><tr><th>Promoteur</th><th>Type</th><th>Investigateurs</th><th>Pays</th><th>Thèmes</th><th style="text-align:right">En cours</th><th style="text-align:right">En construction</th></tr></thead><tbody>
      ${rows.map((v) => `<tr><th>${esc(v.name)}</th><td>${esc(SPONSOR_CLASS[v.cls] || "—")}</td><td>${esc([...v.people].slice(0, 3).join(", ") || "—")}${v.people.size > 3 ? ` <span class="muted">et ${v.people.size - 3} autre(s)</span>` : ""}</td><td>${esc([...v.countries].join(", ") || "—")}</td><td>${[...v.ctx].map((c) => `<span class="badge">${esc(CTX[c] || c)}</span>`).join(" ")}</td><td class="num">${v.now || ""}</td><td class="num">${v.soon || ""}</td></tr>`).join("")}</tbody></table></div></section>` : `<div class="empty">Aucun porteur pour ce filtre.</div>`;
  } else {
    body = `<div class="trials">${list.map(trialCard).join("") || `<div class="empty">Aucune étude pour ce filtre.</div>`}</div>`;
    if (tab === "soon" && protos.length && !state.essCtx) body += `<section class="panel"><div class="panel-head"><h2>Protocoles publiés</h2><p>Projets décrits dans une revue avant leurs résultats (3 dernières années)</p></div><ul class="plist">${protos.map((a) => `<li><a href="#article-${a.pmid}">${esc(a.title_fr || a.title)}</a> <span class="muted">· ${esc(a.journal_abbr || "")}, ${fmtDate(a.date)}${a.authors?.length ? ` · ${esc(a.authors[0])}${a.authors.length > 1 ? " et al." : ""}` : ""}</span></li>`).join("")}</ul></section>`;
  }
  app().innerHTML = `<div class="view">
    <div style="display:grid;gap:12px"><span class="eyebrow">Études en cours · ${esc(t.label)}</span><h1>Essais en cours et projets en construction</h1>
      <p class="lead" style="max-width:70ch">Les études de photobiomodulation qui recrutent, se déroulent ou s'apprêtent à démarrer, avec leurs porteurs : registre ClinicalTrials.gov et registres nationaux rassemblés par l'OMS (Brésil, Inde, Iran, Chine, Australie, Royaume-Uni, Corée, Japon…). Chaque essai est vérifié et classé à la main ; les résultats paraîtront dans les publications.</p></div>
    <div class="kpis kpis-4">
      <div class="kpi"><b>${now.length}</b><span>études en cours</span></div>
      <div class="kpi"><b>${recr}</b><span>recrutent en ce moment</span></div>
      <div class="kpi"><b>${soon.length}</b><span>projets en construction (pas encore ouverts)</span></div>
      <div class="kpi"><b>${sponsors.size}</b><span>porteurs de projets, dans ${countries} pays</span></div>
    </div>
    <div class="ess-bar">
      <div class="syn-tabs">${[["now", "Études en cours", now.length], ["soon", "Projets en construction", soon.length + protos.length], ["porteurs", "Porteurs de projets", sponsors.size]].map(([k, l, n]) => `<button class="chip" data-esstab="${k}" aria-pressed="${tab === k}">${l}<span class="n">${n}</span></button>`).join("")}</div>
      <input class="ess-q" id="essq" type="search" placeholder="Rechercher un porteur, un pays, un essai…" value="${esc(state.essQ)}" aria-label="Rechercher dans les études">
      ${regs.length > 1 ? `<select class="ess-q" id="essreg" aria-label="Registre" style="max-width:240px"><option value="">Tous les registres (${regs.length})</option>${regs.map((r) => `<option value="${esc(r)}" ${state.essReg === r ? "selected" : ""}>${esc(r)} · ${xs.filter((s) => (s.registry || "ClinicalTrials.gov") === r).length}</option>`).join("")}</select>` : ""}
    </div>
    ${ctxs.length > 1 ? `<div class="chips"><button class="chip" data-essctx="" aria-pressed="${!state.essCtx}">Tous les sous-groupes</button>${ctxs.map((c) => `<button class="chip" data-essctx="${c}" aria-pressed="${state.essCtx === c}">${esc(CTX[c] || c)}<span class="n">${xs.filter((s) => s.ctx === c).length}</span></button>`).join("")}</div>` : ""}
    ${xs.length ? body : `<div class="empty">Aucune étude de PBM en cours n'est déclarée aux registres pour ce thème.</div>`}
    <p class="muted" style="font-size:.78rem">Sources : ClinicalTrials.gov (NLM), relevé du <span class="mono">${fmtDate(fetched)}</span>${window.LUMINA_E?.oms_fetched ? ` ; registres primaires de l'OMS via le portail ICTRP (WHO ICTRP), relevé du <span class="mono">${fmtDate(window.LUMINA_E.oms_fetched)}</span>` : ""}. Les informations (dates, effectifs, centres) sont celles déclarées par les promoteurs ; pour participer à une étude ou contacter son équipe, suivre le lien du registre.</p>
  </div>`;
}


/* ---------------- recherche par appareil ---------------- */
const DEV_ICON = {
  laser: '<path d="M4 18 14 8"/><path d="M14 8l2-2 2 2-2 2z"/><path d="M17 4l1-1M20 7l1-1M19 2v2M22 5h-2"/>',
  led: '<rect x="4" y="5" width="16" height="14" rx="3"/><circle cx="9" cy="10" r="1.3"/><circle cx="15" cy="10" r="1.3"/><circle cx="9" cy="14.5" r="1.3"/><circle cx="15" cy="14.5" r="1.3"/>',
  casque: '<path d="M5 14a7 7 0 0 1 14 0v2H5z"/><path d="M8 16v3M16 16v3"/><path d="M9 8l-1-3M12 7V4M15 8l1-3"/>',
  masque: '<path d="M5 6c4-2 10-2 14 0v6c0 4-3 7-7 7s-7-3-7-7z"/><circle cx="9.5" cy="10.5" r="1.4"/><circle cx="14.5" cy="10.5" r="1.4"/>',
  acupuncture: '<circle cx="12" cy="14" r="2"/><path d="M12 3v7M6 8l3 3M18 8l-3 3"/><path d="M7 19h10"/>',
  sonde: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M12 15v6"/><path d="M6 9H4M20 9h-2"/>',
  sang: '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/><path d="M9 14h6M12 11v6"/>',
  oeil: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  corps: '<path d="M3 16h18M5 16v3M19 16v3"/><circle cx="7" cy="12" r="2"/><path d="M10 13h9"/><path d="M5 7h14" stroke-dasharray="2 2"/>',
  domicile: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
};
const USAGE = { cabinet: "Au cabinet", domicile: "À domicile", "les deux": "Cabinet et domicile" };
const topicShort = (id) => D.topics.find((t) => t.id === id)?.short || id;
async function ensureDevices() { if (!window.LUMINA_D && D.devices_file) await loadScript(D.devices_file); return window.LUMINA_D || []; }
function devIcon(k, s = 22) { return `<svg class="dev-ic" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${DEV_ICON[k] || DEV_ICON.laser}</svg>`; }
function effBar(xs) {
  const n = xs.filter((h) => h.c).length; if (!n) return "";
  return `<div class="effbar" role="img" aria-label="Résultats des fiches">${Object.keys(EFFECTS).map((k) => { const v = xs.filter((h) => h.c && h.e === k).length; return v ? `<i data-e="${k}" style="flex:${v}" title="${EFFECTS[k][0]} : ${v}"></i>` : ""; }).join("")}</div>`;
}
async function viewDevices(sel) {
  setNav("appareils");
  app().innerHTML = `<div class="empty">Chargement des appareils…</div>`;
  let devs; try { devs = await ensureDevices(); } catch { app().innerHTML = `<div class="empty">Index des appareils indisponible. Rechargez la page.</div>`; return; }
  const kind = state.devKind, q = state.devQ.toLowerCase(), tf = state.devTopic;
  const list = devs.filter((d) => d.kind === kind && (!tf || d.topics[tf] || d.trials.some((x) => x.t === tf)) && (!q || [d.nom, d.fabricant, d.description, d.lumiere].join(" ").toLowerCase().includes(q)))
    .sort((a, b) => b.nc - a.nc || b.n - a.n);
  const d = sel && devs.find((x) => x.id === sel);
  let detail = "";
  if (d) {
    const studies = d.studies.filter((h) => !tf || h.t === tf);
    const byTopic = {}; studies.forEach((h) => (byTopic[h.t] = byTopic[h.t] || []).push(h));
    const trials = d.trials.filter((x) => !tf || x.t === tf);
    const maxT = Math.max(...Object.values(d.topics), 1);
    detail = `<section class="panel dev-detail" id="dev-detail">
      <div class="panel-head"><div style="display:flex;gap:14px;align-items:center">${devIcon(d.icon, 34)}<div style="display:grid;gap:4px"><span class="eyebrow">${d.kind === "marque" ? esc(d.fabricant || "Marque") : "Type d'appareil"}</span><h2>${esc(d.nom)}</h2></div></div><a class="btn small" href="#appareils">Fermer</a></div>
      <p class="lead" style="max-width:75ch;font-size:1rem">${esc(d.description)}</p>
      <div class="dev-facts"><span><b>Lumière</b>${esc(d.lumiere)}</span><span><b>Usage</b>${USAGE[d.usage] || "—"}</span><span><b>Études citant l'appareil</b>${d.n}</span><span><b>Fiches rédigées</b>${d.nc}</span><span><b>Essais en cours</b>${d.trials.length}</span></div>
      <div class="grid-2" style="align-items:start">
        <div><h3 style="margin-bottom:10px">Par thème</h3><div class="bars-h">${Object.entries(d.topics).sort((a, b) => b[1] - a[1]).map(([t, v]) => `<div class="row"><span>${esc(topicShort(t))}</span><span class="track"><i style="width:${(100 * v / maxT).toFixed(1)}%"></i></span><b class="mono">${v}</b></div>`).join("")}</div></div>
        <div><h3 style="margin-bottom:10px">Résultats des fiches</h3>${effBar(d.studies) || '<p class="muted">Aucune fiche rédigée ne cite cet appareil.</p>'}
          <p class="muted" style="font-size:.8rem;margin-top:8px">${Object.keys(EFFECTS).map((k) => { const v = d.studies.filter((h) => h.c && h.e === k).length; return v ? `${EFFECTS[k][0]} : ${v}` : ""; }).filter(Boolean).join(" · ")}</p></div>
      </div>
      ${Object.keys(byTopic).length ? `<h3 style="margin:18px 0 8px">${d.kind === "marque" ? "Études qui citent l'appareil" : "Fiches rédigées utilisant ce type d'appareil"}</h3>${Object.entries(byTopic).map(([t, xs]) => `<details class="dev-group" ${Object.keys(byTopic).length < 3 ? "open" : ""}><summary><b>${esc(topicShort(t))}</b> <span class="muted">· ${xs.length}</span></summary><ul class="plist">${xs.slice(0, 150).map((h) => `<li><a href="#article-${h.p}">${esc(h.ti)}</a> <span class="muted">· ${h.y} · ${esc(TYPES[h.ty]?.[0] || h.ty)}</span>${h.c && EFFECTS[h.e] ? ` <span class="eff" data-e="${h.e}">${EFF_ICON[h.e]}${EFFECTS[h.e][0]}</span>` : ""}</li>`).join("")}</ul></details>`).join("")}` : ""}
      ${trials.length ? `<h3 style="margin:18px 0 8px">Essais en cours ou en construction</h3><ul class="plist">${trials.map((x) => `<li><a href="${esc(x.u || `https://clinicaltrials.gov/study/${x.n}`)}" target="_blank" rel="noopener">${esc(x.ti)}</a> <span class="muted">· ${esc(topicShort(x.t))} · ${esc((TRIAL_STATUS[x.st] || [x.st])[0])}</span></li>`).join("")}</ul>` : ""}
      <p class="muted" style="font-size:.78rem;margin-top:14px">Détection automatique du nom de l'appareil dans le titre et le résumé : une étude peut citer un appareil sans l'avoir utilisé, et beaucoup d'articles ne nomment pas leur matériel.</p>
    </section>`;
  }
  const topicsWith = D.topics.filter((t) => devs.some((x) => x.kind === kind && x.topics[t.id]));
  app().innerHTML = `<div class="view">
    <div style="display:grid;gap:12px"><span class="eyebrow">Appareils · tous thèmes</span><h1>Recherche par appareil</h1>
      <p class="lead" style="max-width:72ch">Retrouvez les études et les essais en cours selon le type de matériel (laser haute intensité, casque, masque LED…) ou la marque citée dans les articles.</p></div>
    ${detail}
    <div class="ess-bar"><div class="syn-tabs">${[["type", "Types d'appareils"], ["marque", "Marques citées"]].map(([k, l]) => `<button class="chip" data-devkind="${k}" aria-pressed="${kind === k}">${l}<span class="n">${devs.filter((x) => x.kind === k).length}</span></button>`).join("")}</div>
      <input class="ess-q" id="devq" type="search" placeholder="Rechercher un appareil, un fabricant, une longueur d'onde…" value="${esc(state.devQ)}" aria-label="Rechercher un appareil"></div>
    <div class="chips"><button class="chip" data-devtopic="" aria-pressed="${!tf}">Tous les thèmes</button>${topicsWith.map((t) => `<button class="chip" data-devtopic="${t.id}" aria-pressed="${tf === t.id}">${esc(t.short)}</button>`).join("")}</div>
    <div class="dev-grid">${list.map((x) => `<a class="card dev-card" href="#appareil-${x.id}" aria-current="${x.id === sel}">
      <div class="card-top"><div style="display:flex;gap:10px;align-items:center">${devIcon(x.icon)}<div><h3>${esc(x.nom)}</h3>${x.fabricant ? `<span class="src">${esc(x.fabricant)}</span>` : ""}</div></div><span class="badge">${USAGE[x.usage] || ""}</span></div>
      <p class="src" style="margin:0">${esc(x.lumiere)}</p>
      <div class="dev-stats"><span><b>${x.n}</b> études</span><span><b>${x.nc}</b> fiches</span>${x.trials.length ? `<span><b>${x.trials.length}</b> essais en cours</span>` : ""}</div>
      ${effBar(x.studies)}
      <div class="badges">${Object.entries(x.topics).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => `<span class="badge">${esc(topicShort(t))}</span>`).join("")}</div></a>`).join("") || '<div class="empty">Aucun appareil pour ce filtre.</div>'}</div>
  </div>`;
  if (d) $("#dev-detail")?.scrollIntoView({ block: "start" });
}


/* ---------------- fiches paramètres ---------------- */
const NIVEAU = { "recommandée": ["Recommandée", "ok"], prometteuse: ["Prometteuse", "pro"], incertaine: ["Incertaine", "unc"], "non démontrée": ["Non démontrée", "no"] };
const PAR_ICON = {
  "Longueur d'onde": '<path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/>',
  Puissance: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  Dose: '<path d="M9 3h6M10 3v5L5 19a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-11V3"/>',
  Zone: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  "Séances": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  Appareil: '<rect x="4" y="7" width="16" height="10" rx="2"/><path d="M8 7V5h8v2M20 12h2"/>',
};
const nmColor = (nm) => nm < 450 ? "#5b5bf0" : nm < 495 ? "#2f8fe0" : nm < 570 ? "#2fae5f" : nm < 590 ? "#e6c229" : nm < 620 ? "#f08a24" : nm < 700 ? "#e0302f" : "#7d1f2c";
function nmSwatches(txt) {
  const nms = [...new Set((txt.match(/\d[\d  ]{2,4}(?=\s?(?:nm|\+|,|–| ou| et|\)|$))/g) || []).map((x) => +x.replace(/\s/g, "")).filter((n) => n >= 380 && n <= 1300))];
  return nms.length ? `<span class="nm-sw">${nms.slice(0, 5).map((n) => `<i style="background:${nmColor(n)}" title="${n} nm"></i>`).join("")}</span>` : "";
}
function nmStrip(list) {
  const pts = []; list.forEach((a) => (a.nm || []).forEach((n) => n >= 380 && n <= 1300 && pts.push([n, a.effect])));
  if (pts.length < 3) return "";
  const x = (n) => (100 * (n - 380) / 920).toFixed(2);
  return `<div class="nmstrip" aria-label="Longueurs d'onde des fiches de cette indication"><div class="nmstrip-track"></div>${pts.map(([n, e]) => `<i data-e="${e}" style="left:${x(n)}%" title="${n} nm · ${EFFECTS[e]?.[0] || e}"></i>`).join("")}
    <span style="left:0">400</span><span style="left:${x(600)}%">600</span><span style="left:${x(800)}%">800</span><span style="left:${x(1000)}%">1 000 nm</span></div>`;
}
function paramCard(p, topicId) {
  const [nl, nc] = NIVEAU[p.niveau] || [p.niveau, "unc"];
  const list = (window.LUMINA_T?.[topicId] ? all() : []).filter((a) => a.curated !== false && (a.ctx || []).includes(p.ctx));
  return `<article class="pcard">
    <header><div style="display:grid;gap:6px"><span class="eyebrow">${esc(topicShort(topicId))} · ${esc(CTX[p.ctx] || p.ctx)}</span><h3>${esc(p.indication)}</h3></div><span class="pniv" data-n="${nc}">${nl}</span></header>
    <p class="presume">${esc(p.resume)}</p>
    <div class="pgrid">${Object.entries(p.params).filter(([, v]) => v && v !== "—").map(([k, v]) => `<div class="ptile"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">${PAR_ICON[k] || ""}</svg><div><b>${esc(k)}</b><span>${esc(v)}${k === "Longueur d'onde" ? nmSwatches(v) : ""}</span></div></div>`).join("")}</div>
    ${p.conseils.length || p.prudence.length ? `<div class="pnotes">${p.conseils.map((c) => `<p class="ok">${esc(c)}</p>`).join("")}${p.prudence.map((c) => `<p class="warn">${esc(c)}</p>`).join("")}</div>` : ""}
    ${topicId === state.topic && list.length >= 3 ? `<div class="pstrip"><span class="eyebrow">Longueurs d'onde des ${list.length} fiches de ce sous-groupe</span>${nmStrip(list)}</div>` : ""}
    <footer><span class="eyebrow">Sources</span>${p.sources.map((id) => { const a = byId(id); return `<a class="psrc" href="#article-${id}" title="${esc(a?.title_fr || "")}">${a ? esc((TYPES[a.type]?.[0] || "") + " " + a.year) : "PMID " + id}</a>`; }).join("")}</footer>
  </article>`;
}
function viewParams() {
  setNav("parametres");
  const scope = state.parScope, t = topic();
  const groups = scope === "all" ? D.topics.filter((x) => x.params?.length).map((x) => [x.id, x.params]) : [[t.id, t.params || []]];
  const n = groups.reduce((s, [, xs]) => s + xs.length, 0);
  app().innerHTML = `<div class="view">
    <div style="display:grid;gap:12px"><span class="eyebrow">Paramètres · ${scope === "all" ? "tous les thèmes" : esc(t.label)}</span><h1>Fiches paramètres</h1>
      <p class="lead" style="max-width:74ch">Pour chaque indication, les réglages associés aux meilleurs résultats dans les recommandations et les méta-analyses : longueur d'onde, puissance, dose, zone, rythme des séances et type d'appareil. Chaque valeur renvoie à ses sources.</p></div>
    <div class="ess-bar"><div class="syn-tabs">${[["topic", "Ce thème"], ["all", "Tous les thèmes"]].map(([k, l]) => `<button class="chip" data-parscope="${k}" aria-pressed="${scope === k}">${l}</button>`).join("")}</div>
      <div class="plegend">${Object.values(NIVEAU).map(([l, c]) => `<span class="pniv" data-n="${c}">${l}</span>`).join("")}</div></div>
    ${groups.map(([id, xs]) => `${scope === "all" ? `<h2 class="pgroup">${esc(D.topics.find((x) => x.id === id).label)}</h2>` : ""}<div class="pcards">${xs.map((p) => paramCard(p, id)).join("")}</div>`).join("") || ""}
    ${!n ? `<div class="empty">Pas encore de fiche paramètres pour ce thème.</div>` : ""}
    <div class="callout">Ces repères résument la littérature ; ils ne remplacent ni la formation à l'appareil utilisé, ni les consignes du fabricant, ni le jugement clinique. Les doses s'entendent par point d'application sauf mention contraire.</div>
  </div>`;
}


/* ---------------- fiches patients ---------------- */
function viewPatientsList() {
  setNav("patients"); const PT = window.LUMINA_PT; const xs = D.patients || [];
  app().innerHTML = `<div class="view">
    <div style="display:grid;gap:12px"><span class="eyebrow">Fiches patients · à imprimer ou à partager</span><h1>Expliquer la photobiomodulation à vos patients</h1>
      <p class="lead" style="max-width:72ch">Des fiches illustrées, en langage simple : ce que c'est, comment se passe une séance, ce que disent les études et les précautions. Chaque fiche s'imprime sur une page recto verso.</p></div>
    <div class="pt-grid">${xs.map((f) => `<a class="pt-card" href="#patient-${f.id}" style="--pc:${f.couleur}">
      <div class="pt-card-img">${PT.hero(f.illus, f.couleur)}</div>
      <div class="pt-card-body"><span class="eyebrow">${esc(f.sous_titre)}</span><h3>${esc(f.titre)}</h3><span class="pniv" data-n="${(NIVEAU[f.niveau] || [])[1] || "unc"}">${esc((NIVEAU[f.niveau] || [f.niveau])[0])}</span></div></a>`).join("")}</div>
  </div>`;
}
async function viewPatient(id) {
  setNav("patients"); const PT = window.LUMINA_PT; const f = (D.patients || []).find((x) => x.id === id);
  if (!f) return viewPatientsList();
  try { await ensureTopic(f.topic); } catch { /* compteur indisponible */ }
  const arts = ((window.LUMINA_T || {})[f.topic] || []).map((a) => hydrate(a, f.topic)).filter((a) => a.curated !== false && (a.ctx || []).some((c) => f.ctx.includes(c)));
  const fav = arts.filter((a) => a.effect === "favorable").length;
  const meas = arts.filter((a) => EFFECTS[a.effect]).length;
  const S = f.seance;
  app().innerHTML = `<div class="view pt-sheet" style="--pc:${f.couleur}">
    <div class="pt-actions no-print"><a class="btn small" href="#patients">← Toutes les fiches</a><button class="btn small" data-print>Imprimer la fiche</button><button class="btn small" data-copylink>Copier le lien</button></div>
    <section class="pt-top">
      <div class="pt-top-text"><span class="pt-kicker">${esc(f.sous_titre)}</span><h1>${esc(f.titre)}</h1>
        <p class="pt-def"><b>La photobiomodulation</b> utilise une lumière douce, rouge ou infrarouge, qui ne chauffe pas et ne brûle pas, pour aider les cellules à se réparer et à calmer l'inflammation et la douleur.</p></div>
      <div class="pt-top-img">${PT.hero(f.illus, f.couleur)}</div>
    </section>
    <section class="pt-msgs">${f.messages.map(([ic, t]) => `<div class="pt-msg"><span class="pt-ic">${PT.icon(ic, f.couleur)}</span><p>${esc(t)}</p></div>`).join("")}</section>
    <section class="pt-block"><h2><span>1</span>Comment ça marche ?</h2>${PT.mechanism()}</section>
    <section class="pt-block"><h2><span>2</span>Comment se passe une séance ?</h2>
      <div class="pt-steps">${[["lumiere", "Durée", S.duree], ["maison", "Où", S.ou], ["main", "Ce que l'on ressent", S.sensation], ["valide", "Qui la réalise", S.qui]].map(([ic, k, v]) => `<div class="pt-step"><span class="pt-ic">${PT.icon(ic, f.couleur)}</span><b>${k}</b><p>${esc(v)}</p></div>`).join("")}</div>
      <div class="pt-calwrap"><div><h3>Le rythme habituel</h3><p>${esc(f.calendrier.texte)}</p><p class="pt-note">${esc(f.attentes)}</p></div>${PT.calendar(f.calendrier, f.couleur)}</div>
    </section>
    <section class="pt-block pt-evidence"><h2><span>3</span>Ce que disent les études</h2>
      <div class="pt-evgrid">${PT.gauge(f.niveau)}
        <div>${meas ? `<p class="pt-big"><b>${fav}</b> sur <b>${meas}</b></p><p>études analysées sur le site concluent en faveur de la photobiomodulation pour cette indication.</p><div class="pt-evbar"><i style="width:${(100 * fav / meas).toFixed(0)}%"></i></div>` : `<p>Les études sont en cours d'analyse sur le site.</p>`}
          <p class="pt-note">${esc({ "recommandée": "Les sociétés savantes la recommandent ou la proposent dans cette indication.", prometteuse: "Les résultats sont encourageants mais doivent encore être confirmés par de grands essais.", incertaine: "Les résultats sont contradictoires : parlez-en avec votre soignant.", "non démontrée": "L'efficacité n'est pas démontrée à ce jour." }[f.niveau] || "")}</p></div></div>
    </section>
    <section class="pt-block pt-two">
      <div><h2><span>4</span>Est-ce sans danger ?</h2><ul class="pt-safe">${f.securite.map((t) => `<li>${esc(t)}</li>`).join("")}
        <li>La séance ne doit jamais viser directement les yeux, sauf appareil ophtalmologique prévu pour cela.</li></ul></div>
      <div><h2><span>5</span>Vos questions</h2>${f.faq.map(([q, a]) => `<details class="pt-faq" open><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
    </section>
    <footer class="pt-foot"><p>Fiche d'information générale réalisée à partir de la littérature scientifique (Luminathèque, ${fmtDate(D.generated)}). Elle ne remplace pas l'avis de votre médecin ou de votre soignant.</p>
      ${f.sources.length ? `<p class="no-print">Pour les soignants : ${f.sources.map((s) => `<a href="#article-${s}">${s}</a>`).join(", ")} · <a href="#parametres">fiches paramètres</a></p>` : ""}</footer>
  </div>`;
}

/* ---------------- comparateur / fusion ---------------- */
function allWeeks() {
  const have = [...new Set(all().map((a) => a.week))].sort().reverse();
  if (have.length) return have;
  const out = []; const s = weekOf(topic().since || "2024-01-01"); const e = weekOf(today());
  let d = isoWeekStart(s.y, s.w); const end = isoWeekStart(e.y, e.w);
  while (d <= end) { out.push(weekOf(iso(d)).key); d.setUTCDate(d.getUTCDate() + 7); }
  return out.reverse();
}
const weekRange = (k1, k2) => { const [a, b] = [k1, k2].sort(); const [y1, w1] = a.split("-S").map(Number); const [y2, w2] = b.split("-S").map(Number); const e = isoWeekStart(y2, w2); e.setUTCDate(e.getUTCDate() + 6); return [iso(isoWeekStart(y1, w1)), iso(e)]; };
function cmpDefault() {
  return { mode: "compare", A: { from: "2024-01-01", to: "2024-12-31", label: "2024" }, B: { from: "2026-01-01", to: today(), label: "2026" }, sel: false };
}
function periodList(p) { return p.pmids ? p.pmids.map(byId).filter(Boolean) : all().filter((a) => a.date >= p.from && a.date <= p.to); }
function periodName(p) { return p.pmids ? `Sélection de ${p.pmids.length} article(s)` : p.label || `${fmtDate(p.from)} → ${fmtDate(p.to)}`; }
function profile(xs) {
  const pct = (n) => xs.length ? Math.round(100 * n / xs.length) : 0;
  return {
    n: xs.length, rct: xs.filter((a) => a.type === "rct").length, syn: xs.filter((a) => groupOf(a) === "syn").length,
    strong: xs.filter((a) => a.level && a.level <= 2).length, fav: xs.filter((a) => a.effect === "favorable").length,
    pctStrong: pct(xs.filter((a) => a.level && a.level <= 2).length), patients: xs.filter((a) => a.n && !["preclinical", "survey", "qualitative", "biblio"].includes(a.type) && groupOf(a) !== "syn").reduce((s, a) => s + a.n, 0),
    themes: countBy(xs, (a) => a.theme), groups: countBy(xs, groupOf), levels: countBy(xs, (a) => a.level), effects: countBy(xs.filter((a) => EFFECTS[a.effect]), (a) => a.effect),
    ctx: countBy(xs, (a) => a.ctx || []), modes: countBy(xs, (a) => a.mode || []), nm: countBy(xs, (a) => (a.nm || []).map(Math.round)), pops: countBy(xs.filter((a) => a.pop !== "—"), (a) => a.pop),
    rr: xs.filter((a) => a.metric?.kind === "rr"),
  };
}
function autoText(P, xs, name) {
  if (!xs.length) return `<p>Aucune publication sur cette période.</p>`;
  const top = [...P.themes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${t.toLowerCase()} (${n})`).join(", ");
  const rr = P.rr.filter((a) => a.metric.lo).map((a) => `RR ${a.metric.rr.toFixed(2).replace(".", ",")} (${a.journal_abbr} ${a.year})`).join(" ; ");
  const best = xs.filter((a) => a.level && a.level <= 2 && a.key).slice(0, 4);
  return `<p><b>${esc(name)}</b> : ${P.n} publication(s), dont ${P.rct} essai(s) randomisé(s) et ${P.syn} synthèse(s) systématique(s). ${P.pctStrong} % relèvent des niveaux de preuve 1–2. ${P.fav} étude(s) concluent en faveur de la PBM sur ${[...P.effects.values()].reduce((s, v) => s + v, 0)} qui mesurent un effet. Thèmes dominants : ${esc(top)}.${rr ? ` Estimations poolées : ${esc(rr)}.` : ""}</p>
    ${best.length ? `<ul>${best.map((a) => `<li><a href="#article-${a.pmid}">${esc(a.journal_abbr)} ${a.year}</a> : ${esc(a.l1)}</li>`).join("")}</ul>` : ""}`;
}
function diffText(PA, PB, nA, nB) {
  const newThemes = [...PB.themes.keys()].filter((t) => !PA.themes.has(t)); const gone = [...PA.themes.keys()].filter((t) => !PB.themes.has(t));
  const d = (x, y) => (y - x > 0 ? "+" : "") + (y - x);
  return `<ul>
    <li>Volume : ${PA.n} → ${PB.n} publications (${d(PA.n, PB.n)}), essais randomisés ${PA.rct} → ${PB.rct}, synthèses ${PA.syn} → ${PB.syn}.</li>
    <li>Niveaux de preuve 1–2 : ${PA.pctStrong} % → ${PB.pctStrong} %.</li>
    <li>Patients inclus dans les études cliniques primaires : ${PA.patients.toLocaleString("fr-FR")} → ${PB.patients.toLocaleString("fr-FR")}.</li>
    ${newThemes.length ? `<li>Thèmes nouveaux dans « ${esc(nB)} » : ${esc(newThemes.join(", "))}.</li>` : ""}
    ${gone.length ? `<li>Thèmes présents seulement dans « ${esc(nA)} » : ${esc(gone.join(", "))}.</li>` : ""}
    <li>Voie extrabuccale : ${PA.modes.get("extrabuccal") || 0} → ${PB.modes.get("extrabuccal") || 0} études ; LED : ${PA.modes.get("LED") || 0} → ${PB.modes.get("LED") || 0}.</li></ul>`;
}
function dualBars(title, mA, mB, keys, fmt, colA = "var(--s1)", colB = "var(--s2)") {
  const max = Math.max(1, ...keys.map((k) => Math.max(mA?.get(k) || 0, mB?.get(k) || 0)));
  return `<div style="display:grid;gap:8px"><h3 style="font-size:.95rem">${title}</h3><div class="bars-h">${keys.map((k) => { const a = mA.get(k) || 0, b = mB ? mB.get(k) || 0 : null;
    return `<div class="row"><span>${esc(fmt ? fmt(k) : k)}</span><div class="track"><div class="bar" style="width:${100 * a / max}%;background:${colA}"></div>${b !== null ? `<div class="bar" style="width:${100 * b / max}%;background:${colB}"></div>` : ""}</div><span class="vals">${a}${b !== null ? " · " + b : ""}</span></div>`; }).join("")}</div></div>`;
}
function claudePrompt(c, xs, ys) {
  const ids = (l) => l.map((a) => a.pmid).join(", ");
  return c.mode === "compare"
    ? `Luminathèque · thème « ${topic().label} ». Rédige une étude comparative en trois niveaux de lecture (1 : 2 lignes ; 2 : 2 paragraphes ; 3 : analyse détaillée avec niveaux de preuve et tableau) entre :\nA = ${periodName(c.A)} (PMID : ${ids(xs)})\nB = ${periodName(c.B)} (PMID : ${ids(ys)})\nAppuie-toi sur data/curation du dépôt, cite les PMID, signale ce qui change entre A et B et ce qui reste incertain.`
    : `Luminathèque · thème « ${topic().label} ». Rédige une synthèse fusionnée en trois niveaux de lecture de ${periodName(c.A)} (PMID : ${ids(xs)}). Appuie-toi sur data/curation du dépôt, cite les PMID et hiérarchise selon les niveaux de preuve.`;
}
function periodPicker(id, p, weeks) {
  return `<div class="period panel"><div style="display:flex;gap:10px;align-items:center"><span class="period-tag ${id.toLowerCase()}">${id}</span><b style="font-family:var(--f-display)">${esc(periodName(p))}</b></div>
    ${p.pmids ? `<p class="muted" style="font-size:.85rem">Articles cochés dans la liste des publications. <button class="btn small" data-clearsel="${id}">Revenir à une période</button></p>` : `
    <div class="chips">${yearsOf(all()).slice(-4).map(String).map((y) => `<button class="chip" data-pp="${id}" data-y="${y}">${y}</button>`).join("")}<button class="chip" data-pp="${id}" data-y="s1">S1 → S20 de 2026</button><button class="chip" data-pp="${id}" data-y="4w">4 dernières semaines</button></div>
    <div class="dates"><label class="muted" style="font-size:.75rem">De la semaine<select data-wk="${id}-from" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:6px;background:var(--surface);font:500 .8rem var(--f-display)">${weeks.map((k) => `<option ${k === weekOf(p.from).key ? "selected" : ""}>${k}</option>`).join("")}</select></label>
      <label class="muted" style="font-size:.75rem">à la semaine<select data-wk="${id}-to" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:6px;background:var(--surface);font:500 .8rem var(--f-display)">${weeks.map((k) => `<option ${k === weekOf(p.to).key ? "selected" : ""}>${k}</option>`).join("")}</select></label></div>
    <div class="dates"><label class="muted" style="font-size:.75rem">ou du<input type="date" data-pd="${id}-from" value="${p.from}"></label><label class="muted" style="font-size:.75rem">au<input type="date" data-pd="${id}-to" value="${p.to}"></label></div>`}
    <p class="mono muted" style="font-size:.78rem">${periodList(p).length} publication(s)</p></div>`;
}
function viewCompare() {
  setNav("comparer");
  const c = state.cmp || (state.cmp = cmpDefault()); const weeks = allWeeks();
  const xs = periodList(c.A); const ys = c.mode === "compare" ? periodList(c.B) : null;
  const PA = profile(xs); const PB = ys ? profile(ys) : null;
  const lvKeys = [1, 2, 3, 4, 5, 0]; const effKeys = Object.keys(EFFECTS);
  const themeKeys = [...new Set([...PA.themes.keys(), ...(PB ? PB.themes.keys() : [])])].sort((a, b) => ((PB?.themes.get(b) || 0) + (PA.themes.get(b) || 0)) - ((PB?.themes.get(a) || 0) + (PA.themes.get(a) || 0))).slice(0, 10);
  const merged = c.mode === "compare" ? [...xs, ...ys.filter((a) => !xs.includes(a))] : xs;
  app().innerHTML = `<div class="view">
    <div style="display:grid;gap:12px"><span class="eyebrow">Comparateur</span><h1>Fusionner ou comparer des périodes</h1>
      <p class="muted" style="max-width:70ch">Choisissez une période (fusion) ou deux périodes (comparaison) : semaines, années ou dates libres. Vous pouvez aussi cocher des articles dans la liste des publications. Le récapitulatif et les graphiques se recalculent instantanément.</p>
      <div class="syn-tabs"><button class="chip" data-mode="merge" aria-pressed="${c.mode === "merge"}">Fusionner une période</button><button class="chip" data-mode="compare" aria-pressed="${c.mode === "compare"}">Comparer A et B</button></div></div>
    <section class="${c.mode === "compare" ? "grid-2" : ""}">${periodPicker("A", c.A, weeks)}${c.mode === "compare" ? periodPicker("B", c.B, weeks) : ""}</section>
    <section class="panel"><div class="panel-head"><h2>Récapitulatif automatique</h2><p>Calculé à partir des fiches</p></div>
      <div class="prose" style="max-width:none">${autoText(PA, xs, periodName(c.A))}${PB ? autoText(PB, ys, periodName(c.B)) + `<h4>Ce qui change de A à B</h4>${diffText(PA, PB, periodName(c.A), periodName(c.B))}` : ""}</div></section>
    ${PB ? `<section class="cmp-table panel"><table><thead><tr><th></th><th style="text-align:right"><span class="period-tag a">A</span></th><th style="text-align:right"><span class="period-tag b">B</span></th></tr></thead><tbody>
      ${[["Publications", PA.n, PB.n], ["Essais randomisés", PA.rct, PB.rct], ["Synthèses systématiques", PA.syn, PB.syn], ["Niveau de preuve 1–2", PA.strong, PB.strong], ["Résultats favorables", PA.fav, PB.fav], ["Patients (études primaires)", PA.patients, PB.patients]]
        .map(([l, a, b]) => `<tr><th>${l}</th><td class="num">${a.toLocaleString("fr-FR")}</td><td class="num">${b.toLocaleString("fr-FR")}</td></tr>`).join("")}</tbody></table></section>` : ""}
    <section class="grid-2">
      <div class="panel" style="display:grid;gap:20px">${dualBars("Niveaux de preuve", PA.levels, PB?.levels, lvKeys, (k) => k ? `${k} · ${LEVELS[k][0]}` : "Non gradé")}${dualBars("Sens des résultats", PA.effects, PB?.effects, effKeys, (k) => EFFECTS[k][0])}${PB ? legend([["A · " + periodName(c.A), "var(--s1)"], ["B · " + periodName(c.B), "var(--s2)"]]) : ""}</div>
      <div class="panel" style="display:grid;gap:20px">${dualBars("Thèmes", PA.themes, PB?.themes, themeKeys)}${dualBars("Contextes", PA.ctx, PB?.ctx, Object.keys(CTX), (k) => CTX[k])}</div>
    </section>
    <section class="grid-2"><div class="panel"><div class="panel-head"><h2>Méta-analyses</h2></div>${chartForest(merged)}</div><div class="panel"><div class="panel-head"><h2>Essais</h2></div>${chartDumbbell(merged)}</div></section>
    <section class="panel"><div class="panel-head"><h2>Demander une synthèse rédigée</h2><p>À coller dans une conversation avec Claude</p></div>
      <textarea class="prompt-box" id="prompt" readonly>${esc(claudePrompt(c, xs, ys || []))}</textarea><div style="margin-top:8px"><button class="btn" data-copy="#prompt">Copier la demande</button></div></section>
    <details class="panel"><summary style="cursor:pointer"><h2 style="display:inline">Publications incluses</h2> <span class="muted">· ${merged.length} au total, afficher la liste</span></summary><div style="display:grid;gap:10px;margin-top:14px">${merged.map((a) => card(a, { noSel: true })).join("")}</div></details>
  </div>`;
}

function viewMethode() {
  setNav("methode"); const t = topic();
  app().innerHTML = `<div class="view" style="max-width:900px">
    <div style="display:grid;gap:12px"><span class="eyebrow">Méthode</span><h1>Comment lire ce site</h1></div>
    <section class="panel prose" style="max-width:none"><h2>Trois niveaux de lecture</h2>
      <p><b>${levelBars(1)}Express</b> : une ou deux lignes, le résultat principal en chiffres.</p>
      <p><b>${levelBars(2)}Essentiel</b> : un ou deux paragraphes sur la méthode, les résultats et leur portée.</p>
      <p><b>${levelBars(3)}Approfondi</b> : méthode et résultats clés point par point, limites, conséquences pour la pratique, résumé original et, quand l'article est en accès libre, le PDF complet dans le lecteur.</p>
      <p>Le niveau choisi s'applique partout. Sur chaque carte, « Lire plus » permet aussi d'approfondir un seul article.</p></section>
    <section class="panel"><h2 style="margin-bottom:12px">Niveaux de preuve</h2><div class="grid-2" style="align-items:center">${chartPyramid(all())}
      <div class="prose" style="font-size:.92rem">${[1, 2, 3, 4, 5, 0].map((l) => `<p><span class="lvl" data-l="${l}"><i>${l || "–"}</i>${l ? "Niveau " + l : "Non gradé"}</span> <b>${LEVELS[l][0]}</b> : ${LEVELS[l][1]}.</p>`).join("")}
      <p class="muted">Échelle simplifiée, inspirée de l'Oxford CEBM (2011) pour les questions de traitement. Le niveau décrit le plan d'étude, pas sa qualité : une méta-analyse de petits essais biaisés reste fragile, ce que signalent les sections « Limites ».</p></div></div></section>
    <section class="panel prose" style="max-width:none"><h2>Sources et sélection</h2>
      <p>Chaque semaine, la veille interroge PubMed (date de mise en ligne et date de publication) puis Europe PMC pour l'accès libre et la licence. Requête actuelle :</p>
      <pre class="mono" style="white-space:pre-wrap;font-size:.75rem;background:var(--surface-2);padding:12px;border-radius:8px;margin:0">${esc(t.pubmed_query)}</pre>
      <p>${t.n_raw} notices retrouvées, ${t.n_excluded} écartées car hors sujet (${esc(t.exclusions_note || "")}), ${all().length} analysées. Les dates correspondent à la mise en ligne de l'article. Les semaines suivent la norme ISO (lundi à dimanche).</p>
      <p>Les fiches sont rédigées à partir du résumé PubMed et, pour les articles en accès libre, du texte intégral. Les PDF proviennent du dépôt officiel PMC Open Access de la NLM et ne sont repris que sous licence Creative Commons, avec mention de la licence sur la fiche. Pour les autres articles, le site renvoie vers la source originale (DOI, PubMed).</p>
      <div class="callout">Ce site est un outil de veille et ne remplace pas la lecture critique des articles ni les recommandations (MASCC/ISOO, sociétés savantes). Les chiffres sont recopiés des résumés : en cas de doute, la source originale fait foi.</div></section>
    <section class="panel prose" style="max-width:none"><h2>Études en cours et projets en construction</h2>
      <p>La rubrique « Études en cours » interroge le registre international <a href="https://clinicaltrials.gov" target="_blank" rel="noopener">ClinicalTrials.gov</a> et, via le <a href="https://trialsearch.who.int" target="_blank" rel="noopener">portail ICTRP de l'OMS</a>, les registres nationaux reconnus par l'OMS (ReBEC au Brésil, CTRI en Inde, IRCT en Iran, ChiCTR en Chine, ANZCTR en Australie, ISRCTN, DRKS, CRIS, jRCT, TCTR…), en écartant les doublons : études de photobiomodulation qui recrutent, se poursuivent (inclusions closes) ou sont déclarées mais pas encore ouvertes (« projets en construction »). L'ICTRP ne distingue que « recrute » et « ne recrute pas » : un essai qui ne recrute pas est classé en construction si ses inclusions démarrent bientôt, en cours si elles ont commencé il y a moins d'un an ; un essai qui recrute depuis plus de trois ans est écarté, son statut n'étant souvent plus tenu à jour. Le registre européen CTIS ne contient que des essais de médicaments et aucun essai de PBM. Chaque essai est relu, rattaché à un thème et à un sous-groupe, et reçoit un titre en français ; ceux qui ne relèvent pas de la PBM (lasers ablatifs, lumière visuelle, imagerie proche infrarouge…) sont écartés. Les porteurs (promoteur, investigateur principal, partenaires, centres) sont ceux déclarés au registre. Les protocoles publiés dans une revue apparaissent avec les projets en construction.</p></section>
    <section class="panel prose" style="max-width:none"><h2>Mise à jour</h2><p>Rythme actuel : <b>${esc(t.cadence)}</b>, modifiable à tout moment. La procédure est décrite dans <span class="mono">ROUTINE.md</span> : collecte des nouveautés, rédaction des fiches en trois niveaux, mise à jour des synthèses, publication. Ajouter une pathologie revient à créer un fichier de thème (requête PubMed) ; le site l'affiche automatiquement dans le sélecteur.</p></section>
  </div>`;
}

/* ---------------- alertes par mail (abonnement, gestion, aperçu, flux RSS) ---------------- */
const AL_LEVELS = [[1, "Synthèses d'essais seulement"], [2, "Synthèses et essais randomisés"], [3, "Jusqu'aux essais non randomisés"], [5, "Toutes les publications"]];
const AL_CONTENT = [["f", "Fiches rédigées", "Les études clés analysées en français, avec le niveau de preuve et le résultat"],
  ["n", "Toutes les nouvelles publications", "Chaque nouvel article indexé (titre et revue, en anglais), selon le niveau de preuve choisi"],
  ["e", "Essais cliniques", "Nouveaux essais déclarés et changements de statut (ouverture, clôture des inclusions)"]];
const alTopics = () => D.topics.filter((t) => !isSoon(t) && t.code);
function alDefault() { return { topics: {}, content: new Set(["f", "e"]), level: 5, freq: "h", email: "", sent: null, err: "", busy: false, mode: "new", api: null, manage: null, linkSent: false }; }
function alEncode(a) {
  const tps = alTopics().filter((t) => a.topics[t.id] !== undefined).map((t) => { const subs = a.topics[t.id]; return t.code + (subs && subs.size && subs.size < (t.subgroups || []).length ? [...subs].map((c) => "." + t.subgroups.indexOf(c)).join("") : ""); });
  return `1;${a.freq};${a.level};${["f", "n", "e"].filter((c) => a.content.has(c)).join("")};${tps.join(",")}`;
}
function alDecode(s, a) {
  const [, freq, level, content, tps] = (s || "").split(";"); if (!tps) return;
  a.freq = freq; a.level = +level; a.content = new Set(content.split("")); a.topics = {};
  tps.split(",").forEach((p) => { const [code, ...idx] = p.split("."); const t = alTopics().find((x) => x.code === code); if (t) a.topics[t.id] = idx.length ? new Set(idx.map((i) => t.subgroups[+i]).filter(Boolean)) : null; });
}
async function alApi(path, opts = {}) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), opts.timeout || 70000);
  try {
    const r = await fetch(store.get("alerts_api", D.alerts_api) + path, { method: opts.body ? "POST" : "GET", headers: opts.body ? { "Content-Type": "application/json" } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctl.signal });
    const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j.erreur || `Erreur ${r.status}`); return j;
  } finally { clearTimeout(tm); }
}
function alPreview(a) {
  const N = D.news || { a: {}, e: {} }; const out = {}; const want = (tp, ctx) => a.topics[tp] !== undefined && (!a.topics[tp] || !a.topics[tp].size || (ctx || []).some((c) => a.topics[tp].has(c)));
  for (const [k, [d, cur, lvl, ctx, ti]] of Object.entries(N.a || {})) {
    const [tp, pmid] = k.split(":"); if (!want(tp, ctx)) continue;
    if (cur ? a.content.has("f") : a.content.has("n") && (a.level >= 5 || (lvl > 0 && lvl <= a.level))) (out[tp] ||= { f: [], n: [], e: [] })[cur ? "f" : "n"].push({ pmid, d, ti });
  }
  if (a.content.has("e")) for (const [id, [vu, ch, tp, ctx, ti]] of Object.entries(N.e || {})) if (want(tp, [ctx])) (out[tp] ||= { f: [], n: [], e: [] }).e.push({ id, d: vu > ch ? vu : ch, ti });
  return out;
}
function alSection(n, title, sub, body) { return `<section class="panel al-step"><div class="al-step-h"><span class="al-num">${n}</span><div><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ""}</div></div>${body}</section>`; }
async function viewAlertes(params) {
  setNav("alertes"); const a = state.alert ||= alDefault();
  const etat = params.get("etat"), e = params.get("e"), t = params.get("t");
  if (e && t && (!a.manage || a.manage.e !== e)) {
    a.manage = { e, t, loading: true }; a.mode = "manage";
    alApi(`/api/preferences?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`).then((j) => { alDecode(j.prefs, a); a.manage = { e, t, statut: j.statut, last: j.dernier_envoi, since: j.depuis }; rerender(); })
      .catch((x) => { a.manage = { e, t, error: x.message }; rerender(); });
  }
  if (a.api === null) { a.api = "?"; alApi("/api/sante", { timeout: 65000 }).then((j) => { a.api = j.brevo ? "ok" : j.mode === "off" ? "off" : "dev"; rerender(); }).catch(() => { a.api = "ko"; rerender(); }); }
  const tps = alTopics(); const nT = Object.keys(a.topics).length;
  const msg = { confirme: ["ok", "Votre inscription est confirmée. Votre première lettre arrivera lundi prochain s'il y a du nouveau dans vos thèmes."], desinscrit: ["ok", "Vous êtes désabonné et votre adresse a été effacée. À bientôt peut-être !"],
    "lien-invalide": ["warn", "Ce lien n'est pas valide. Demandez un nouveau lien personnel ci-dessous."], inconnu: ["warn", "Cette adresse n'a pas (ou plus) d'abonnement."] }[etat];
  const prev = alPreview(a); const pv = Object.entries(prev).sort((x, y) => topicShort(x[0]).localeCompare(topicShort(y[0])));
  const cnt = (k) => pv.reduce((s, [, v]) => s + v[k].length, 0);
  const apiNote = a.api === "ko" ? `<div class="al-banner warn">Le service d'envoi des alertes n'est pas joignable pour le moment. Réessayez plus tard, ou abonnez-vous dès maintenant aux <a href="#al-rss">flux RSS</a>.</div>` : a.api === "?" ? `<div class="al-banner">Connexion au service d'alertes… (le premier accès peut prendre jusqu'à une minute)</div>` : a.api === "dev" ? `<div class="al-banner warn">Service en mode test : les mails sont écrits dans des fichiers locaux, pas envoyés.</div>` : a.api === "off" ? `<div class="al-banner">Les alertes par mail ouvrent très bientôt. Vous pouvez déjà préparer vos choix et voir l'aperçu ; en attendant, abonnez-vous aux <a href="#al-rss">flux RSS</a>.</div>` : "";
  const manage = a.mode === "manage" && a.manage;
  app().innerHTML = `<div class="view al">
    <div style="display:grid;gap:12px"><span class="eyebrow">Alertes par mail${manage ? " · votre abonnement" : ""}</span><h1>${manage ? "Gérer mes alertes" : "Recevez les nouveautés qui vous concernent"}</h1>
      <p class="lead" style="max-width:72ch">${manage ? `Abonnement de <b>${esc(a.manage.e)}</b>${a.manage.since ? `, depuis le ${fmtDate(a.manage.since)}` : ""}${a.manage.last ? ` · dernière lettre le ${fmtDate(a.manage.last)}` : ""}. Modifiez vos choix puis enregistrez.` : "Choisissez vos thèmes et sous-thèmes : chaque lundi, une lettre personnalisée rassemble les nouvelles fiches, les publications et les essais cliniques qui vous intéressent, et rien d'autre. Pas de compte ni de mot de passe : chaque lettre contient votre lien personnel pour modifier vos choix ou vous désabonner."}</p></div>
    ${msg ? `<div class="al-banner ${msg[0]}">${msg[1]}</div>` : ""}${apiNote}
    ${manage && a.manage.loading ? `<div class="empty">Chargement de vos préférences…</div>` : manage && a.manage.error ? `<div class="al-banner warn">${esc(a.manage.error)}</div>` : ""}
    <div class="al-grid"><div class="al-form">
      ${alSection(1, "Thèmes", "Cochez un thème pour le suivre en entier, ou affinez par sous-thème.", `<div class="al-topics">${tps.map((tp) => { const on = a.topics[tp.id] !== undefined; const subs = a.topics[tp.id];
        return `<div class="al-topic" data-on="${on}" style="--tc:${tp.color || "var(--accent)"}"><button class="al-tbtn" data-al-topic="${tp.id}" aria-pressed="${on}"><span class="al-check"></span><span><b>${esc(tp.label)}</b><small>${tp.n.toLocaleString("fr-FR")} publications · ${tp.n_curated} fiches</small></span></button>
          ${on && tp.subgroups?.length ? `<div class="al-subs"><button class="chip" data-al-sub="${tp.id}" data-c="" aria-pressed="${!subs || !subs.size}">Tout le thème</button>${tp.subgroups.map((c) => `<button class="chip" data-al-sub="${tp.id}" data-c="${esc(c)}" aria-pressed="${!!subs?.has(c)}">${esc(CTX[c] || c)}</button>`).join("")}</div>` : ""}</div>`; }).join("")}</div>`)}
      ${alSection(2, "Contenu", "", `<div class="al-opts">${AL_CONTENT.map(([k, l, d]) => `<button class="al-opt" data-al-content="${k}" aria-pressed="${a.content.has(k)}"><span class="al-check"></span><span><b>${l}</b><small>${d}</small></span></button>`).join("")}</div>
        ${a.content.has("n") ? `<div class="al-row"><span class="muted">Niveau de preuve des publications</span><div class="seg">${AL_LEVELS.map(([v, l]) => `<button data-al-level="${v}" aria-pressed="${a.level === v}">${l}</button>`).join("")}</div></div>` : ""}`)}
      ${alSection(3, "Fréquence", "", `<div class="seg">${[["h", "Chaque lundi"], ["m", "Une fois par mois"]].map(([v, l]) => `<button data-al-freq="${v}" aria-pressed="${a.freq === v}">${l}</button>`).join("")}</div>`)}
      ${manage ? `<section class="panel al-step"><div class="al-actions"><button class="btn primary" data-al-save ${!nT || !a.content.size || a.busy ? "disabled" : ""}>${a.busy ? "Enregistrement…" : "Enregistrer mes choix"}</button><button class="btn" data-al-unsub>Me désabonner</button>${a.sent ? `<span class="al-ok">${esc(a.sent)}</span>` : ""}${a.err ? `<span class="al-err">${esc(a.err)}</span>` : ""}</div></section>`
      : alSection(4, "Votre adresse", "", `<form class="al-mail" onsubmit="return false"><input id="al-email" type="email" autocomplete="email" placeholder="prenom.nom@exemple.fr" value="${esc(a.email)}" aria-label="Adresse mail" required>
          <input id="al-site" name="site" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px" value="">
          <button class="btn primary" data-al-submit ${!nT || !a.content.size || a.busy || a.api === "off" ? "disabled" : ""}>${a.busy ? "Envoi…" : "Recevoir les alertes"}</button></form>
          <label class="al-consent"><input type="checkbox" id="al-consent" ${a.consent ? "checked" : ""}> J'accepte de recevoir ces alertes. Mon adresse sert uniquement à leur envoi, chez le routeur français Brevo ; elle est effacée dès la désinscription (un lien en bas de chaque lettre).</label>
          ${a.sent ? `<div class="al-banner ok">${esc(a.sent)}</div>` : ""}${a.err ? `<div class="al-banner warn">${esc(a.err)}</div>` : ""}
          ${!nT ? `<p class="muted" style="font-size:.82rem">Choisissez au moins un thème.</p>` : ""}`)}
    </div>
    <aside class="al-side">
      <section class="panel al-prev"><span class="eyebrow">Aperçu</span><h2>Ce que vous auriez reçu ces ${Math.round((Date.now() - Date.parse(D.news?.since || D.generated)) / 6048e5)} dernières semaines</h2>
        ${nT ? `<div class="al-kpis"><div><b>${cnt("f")}</b><span>fiches</span></div><div><b>${cnt("n")}</b><span>publications</span></div><div><b>${cnt("e")}</b><span>essais</span></div></div>
          ${pv.length ? pv.map(([tp, v]) => `<div class="al-pt"><b>${esc(topicShort(tp))}</b>${[...v.f.slice(0, 3).map((x) => `<a href="#article-${x.pmid}">${esc(x.ti)}</a>`), ...v.e.slice(0, 2).map((x) => `<span>${esc(x.ti)} <em>· essai</em></span>`), ...(v.f.length < 2 ? v.n.slice(0, 2).map((x) => `<a href="#article-${x.pmid}" lang="en">${esc(x.ti)}</a>`) : [])].join("")}${v.f.length + v.n.length + v.e.length > 5 ? `<small class="muted">et ${v.f.length + v.n.length + v.e.length - Math.min(3, v.f.length) - Math.min(2, v.e.length) - (v.f.length < 2 ? Math.min(2, v.n.length) : 0)} autre(s)</small>` : ""}</div>`).join("") : `<p class="muted">Rien de neuf dans ces thèmes sur la période : vous n'auriez reçu aucune lettre (on n'envoie jamais de lettre vide).</p>`}` : `<p class="muted">Choisissez un thème pour voir un aperçu.</p>`}
      </section>
      ${manage ? "" : `<section class="panel"><h3>Déjà inscrit ?</h3><p class="muted" style="font-size:.85rem;margin:6px 0 10px">Recevez à nouveau votre lien personnel pour modifier vos alertes.</p>
        <div class="al-mail"><input id="al-email2" type="email" placeholder="Votre adresse" aria-label="Adresse mail de l'abonnement"><button class="btn" data-al-link>Recevoir mon lien</button></div>${a.linkSent ? `<p class="al-ok" style="margin-top:8px">Si un abonnement existe pour cette adresse, le lien vient d'être envoyé.</p>` : ""}</section>`}
      <section class="panel" id="al-rss"><h3>Sans inscription : flux RSS</h3><p class="muted" style="font-size:.85rem;margin:6px 0 10px">À ajouter dans un lecteur de flux (Feedly, Inoreader, Thunderbird, Outlook…) : les 50 dernières arrivées, sans adresse mail.</p>
        <ul class="al-feeds"><li><a href="flux/tout.xml">Tous les thèmes</a></li>${tps.map((tp) => `<li><a href="flux/${tp.id}.xml">${esc(tp.label)}</a></li>`).join("")}</ul></section>
    </aside></div>
  </div>`;
}

async function alClick(t) {
  const d = t.dataset, a = state.alert; if (!a) return false;
  if (d.alTopic) { const id = d.alTopic; if (a.topics[id] !== undefined) delete a.topics[id]; else a.topics[id] = null; a.sent = a.err = ""; }
  else if ("alSub" in d) { const id = d.alSub, c = d.c; if (!c) a.topics[id] = null; else { const s = a.topics[id] || new Set(); s.has(c) ? s.delete(c) : s.add(c); a.topics[id] = s.size ? s : null; } }
  else if (d.alContent) { a.content.has(d.alContent) ? a.content.delete(d.alContent) : a.content.add(d.alContent); }
  else if (d.alLevel) a.level = +d.alLevel;
  else if (d.alFreq) a.freq = d.alFreq;
  else if ("alSubmit" in d) {
    a.email = $("#al-email")?.value.trim() || ""; a.consent = $("#al-consent")?.checked; a.sent = a.err = "";
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(a.email)) a.err = "Adresse mail invalide.";
    else if (!a.consent) a.err = "Merci de cocher la case d'accord pour recevoir les alertes.";
    else { a.busy = true; rerender();
      try { const j = await alApi("/api/inscription", { body: { email: a.email, prefs: alEncode(a), consentement: true, site: $("#al-site")?.value || "" } });
        a.sent = j.etat === "deja" ? "Cette adresse est déjà abonnée : nous venons de vous envoyer votre lien personnel pour modifier vos alertes." : `Presque fini ! Un mail de confirmation vient d'être envoyé à ${a.email}. Cliquez sur le lien qu'il contient pour activer vos alertes (pensez à vérifier les indésirables).`;
      } catch (x) { a.err = x.name === "AbortError" ? "Le service ne répond pas. Réessayez dans une minute." : x.message; }
      a.busy = false; }
  }
  else if ("alSave" in d) { a.busy = true; a.sent = a.err = ""; rerender();
    try { await alApi("/api/preferences", { body: { e: a.manage.e, t: a.manage.t, prefs: alEncode(a) } }); a.sent = "Vos choix sont enregistrés."; } catch (x) { a.err = x.message; }
    a.busy = false; }
  else if ("alUnsub" in d) { if (!confirm("Se désabonner et effacer votre adresse ?")) return true;
    try { await alApi("/api/desinscription", { body: { e: a.manage.e, t: a.manage.t } }); state.alert = alDefault(); state.alert.api = a.api; location.hash = "alertes?etat=desinscrit"; return true; } catch (x) { a.err = x.message; } }
  else if ("alLink" in d) { const em = $("#al-email2")?.value.trim(); if (!em) return true;
    try { await alApi("/api/lien", { body: { email: em } }); a.linkSent = true; } catch (x) { a.err = x.message; } }
  else return false;
  rerender(); return true;
}

/* ---------------- brouillons de fiches préparés par Claude, à valider ---------------- */
const BR_TYPES = ["ma", "sr", "umbrella", "guideline", "rct", "nrct", "cohort", "cases", "review", "preclinical", "protocol", "survey", "qualitative", "biblio", "methodo", "letter"];
const BR_CTX_FALLBACK = { "mucite-orale": ["ORL", "chimio", "CSH", "mixte"], "neuropathie-peripherique": ["CIPN", "diabète", "compression", "lésion nerveuse", "orofaciale", "autres"] };
const brStore = { get: () => store.get("br-decisions", []), set: (v) => store.set("br-decisions", v) };
async function ensureDrafts() { if (!window.LUMINA_B && D.drafts_file) await loadScript(D.drafts_file); return window.LUMINA_B || []; }
const brCtx = (tid) => D.topics.find((t) => t.id === tid)?.subgroups?.length ? D.topics.find((t) => t.id === tid).subgroups : BR_CTX_FALLBACK[tid] || ["autres"];
function brReadForm(el, base) {
  const v = (n) => el.querySelector(`[name="${n}"]`)?.value ?? ""; const lines = (n) => v(n).split("\n").map((x) => x.trim()).filter(Boolean);
  const list = (n) => v(n).split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  const f = { pmid: base.pmid, title_fr: v("title_fr").trim(), type: v("type"), level: +v("level"), pop: v("pop"), ctx: [...el.querySelectorAll("[data-brctx][aria-pressed='true']")].map((b) => b.dataset.brctx),
    aim: v("aim"), mode: list("mode"), nm: list("nm").map(Number).filter((x) => x > 0), n: v("n") ? +v("n") : null, effect: v("effect"), theme: v("theme").trim(),
    l1: v("l1").trim(), l2: v("l2").trim(), l3: { points: lines("points"), limites: lines("limites"), pratique: v("pratique").trim() } };
  if (base.key) f.key = true; if (base.metric) f.metric = base.metric; return f;
}
function brField(label, html, wide) { return `<label class="br-f${wide ? " wide" : ""}"><span>${label}</span>${html}</label>`; }
function brSelect(name, val, opts) { return `<select name="${name}">${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(val) === String(k) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`; }
function brCard(d, dec) {
  const f = dec?.fiche || d.fiche; const t = D.topics.find((x) => x.id === d.theme); const ctxs = brCtx(d.theme);
  const ab = (d.abstract || []).map((p) => `<p>${p.label ? `<b>${esc(p.label)}.</b> ` : ""}${esc(p.text)}</p>`).join("");
  return `<article class="panel br-card" data-brcard="${d.pmid}" data-state="${dec?.action || ""}">
    <div class="br-top"><div class="br-tags"><span class="badge">${esc(t?.short || d.theme)}</span><span class="br-by">Brouillon préparé par ${esc(d.par || "Claude")} le ${fmtDate(d.genere)}${d.texte_integral ? " · à partir du texte intégral" : " · à partir du résumé"}</span></div>
      ${dec ? `<span class="br-dec" data-a="${dec.action}">${dec.action === "valider" ? "Validée" : "Exclue"} · en attente de publication <button class="btn small" data-br-undo="${d.pmid}">Annuler</button></span>` : ""}</div>
    ${d.pertinent === false ? `<div class="al-banner warn"><b>Claude propose d'écarter cette étude.</b> ${esc(d.raison_exclusion || "")}</div>` : ""}
    ${d.a_verifier?.length ? `<div class="br-check"><b>À vérifier</b><ul>${d.a_verifier.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    <div class="br-cols">
      <form class="br-form" onsubmit="return false">
        ${brField("Titre français", `<input name="title_fr" value="${esc(f.title_fr)}">`, true)}
        <div class="br-row">${brField("Type", brSelect("type", f.type, BR_TYPES.map((k) => [k, TYPES[k]?.[0] || k])))}${brField("Niveau", brSelect("level", f.level, [0, 1, 2, 3, 4, 5].map((k) => [k, k ? `Niveau ${k}` : "Non gradé"])))}
          ${brField("Résultat", brSelect("effect", f.effect, [["favorable", "Favorable"], ["neutre", "Pas de différence"], ["mitigé", "Mitigé"], ["défavorable", "Défavorable"], ["—", "Sans objet"]]))}
          ${brField("Population", brSelect("pop", f.pop, [["adulte", "Adulte"], ["pédiatrie", "Pédiatrie"], ["mixte", "Mixte"], ["—", "—"]]))}
          ${brField("Objectif", brSelect("aim", f.aim, [["traitement", "Traitement"], ["prévention", "Prévention"], ["les deux", "Les deux"], ["—", "—"]]))}
          ${brField("Effectif", `<input name="n" type="number" min="0" value="${f.n ?? ""}">`)}</div>
        <div class="br-f wide"><span>Sous-groupes</span><div class="chips">${ctxs.map((c) => `<button type="button" class="chip" data-brctx="${esc(c)}" aria-pressed="${(f.ctx || []).includes(c)}">${esc(CTX[c] || c)}</button>`).join("")}</div></div>
        <div class="br-row">${brField("Longueurs d'onde (nm)", `<input name="nm" value="${esc((f.nm || []).join(", "))}">`)}${brField("Modalités", `<input name="mode" value="${esc((f.mode || []).join(", "))}">`)}${brField("Thème court", `<input name="theme" value="${esc(f.theme || "")}">`)}</div>
        ${brField("Express (1–2 lignes)", `<textarea name="l1" rows="2">${esc(f.l1)}</textarea>`, true)}
        ${brField("Essentiel", `<textarea name="l2" rows="7">${esc(f.l2)}</textarea>`, true)}
        <div class="br-row two">${brField("Points (un par ligne)", `<textarea name="points" rows="5">${esc((f.l3?.points || []).join("\n"))}</textarea>`)}${brField("Limites (une par ligne)", `<textarea name="limites" rows="5">${esc((f.l3?.limites || []).join("\n"))}</textarea>`)}</div>
        ${brField("En pratique", `<textarea name="pratique" rows="2">${esc(f.l3?.pratique || "")}</textarea>`, true)}
        <div class="al-actions"><button class="btn primary" data-br-act="valider" data-pmid="${d.pmid}">Valider la fiche</button><button class="btn" data-br-act="exclure" data-pmid="${d.pmid}">Exclure l'étude</button></div>
      </form>
      <aside class="br-src"><span class="eyebrow">Article original</span><h3 lang="en">${esc(d.title)}</h3><p class="muted" style="font-size:.8rem">${esc(d.journal || "")} · ${d.date ? fmtDate(d.date) : ""} · <a href="https://pubmed.ncbi.nlm.nih.gov/${d.pmid}/" target="_blank" rel="noopener">PubMed ↗</a>${d.doi ? ` · <a href="https://doi.org/${esc(d.doi)}" target="_blank" rel="noopener">DOI ↗</a>` : ""}</p>
        <div class="br-abs" lang="en">${ab || "<p class='muted'>Pas de résumé.</p>"}</div></aside>
    </div></article>`;
}
async function viewBrouillons() {
  setNav("brouillons"); app().innerHTML = `<div class="empty">Chargement des brouillons…</div>`;
  const all = await ensureDrafts(); const decs = brStore.get(); const byP = Object.fromEntries(decs.map((x) => [x.pmid, x]));
  const st = state.br ||= { theme: "", msg: "", err: "", busy: false };
  const themes = [...new Set(all.map((d) => d.theme))]; const xs = all.filter((d) => !st.theme || d.theme === st.theme);
  const tok = store.get("gh-token", "");
  app().innerHTML = `<div class="view br">
    <div style="display:grid;gap:12px"><span class="eyebrow">Brouillons · espace de relecture</span><h1>Fiches préparées par Claude, à valider</h1>
      <p class="lead" style="max-width:74ch">Pour chaque nouvelle étude clé, Claude rédige un brouillon de fiche à partir du résumé (et du texte intégral quand il est en accès libre), avec les points à vérifier. Le dernier mot reste humain : corrigez si besoin, puis validez ou excluez. Ces brouillons n'apparaissent jamais parmi les fiches du site tant qu'ils ne sont pas validés.</p></div>
    <div class="br-bar panel"><div><b>${decs.length}</b> décision${decs.length > 1 ? "s" : ""} en attente de publication${decs.length ? ` (${decs.filter((x) => x.action === "valider").length} validée(s), ${decs.filter((x) => x.action === "exclure").length} exclue(s))` : ""}</div>
      <div class="al-actions">${tok ? `<button class="btn primary" data-br-publish ${!decs.length || st.busy ? "disabled" : ""}>${st.busy ? "Publication…" : "Publier sur le site"}</button>` : `<button class="btn primary" data-br-export ${!decs.length ? "disabled" : ""}>Télécharger les décisions</button>`}
        <details class="br-gh"><summary class="btn small">${tok ? "Publication directe activée" : "Activer la publication directe"}</summary><div class="br-ghp">
          <p class="muted">Collez un jeton GitHub « fine-grained » limité au dépôt ${esc(D.repo?.owner || "")}/${esc(D.repo?.name || "")}, avec la permission <i>Contents : Read and write</i>. Il reste dans ce navigateur. À chaque publication, les décisions sont déposées dans le dépôt ; une action GitHub les applique et reconstruit le site en quelques minutes.</p>
          <div class="al-mail"><input id="br-token" type="password" placeholder="github_pat_…" value="${tok ? "••••••••" : ""}" aria-label="Jeton GitHub"><button class="btn" data-br-token>${tok ? "Remplacer" : "Enregistrer"}</button>${tok ? `<button class="btn" data-br-token-del>Oublier</button>` : ""}</div></div></details></div>
      ${st.msg ? `<div class="al-banner ok" style="grid-column:1/-1">${esc(st.msg)}</div>` : ""}${st.err ? `<div class="al-banner warn" style="grid-column:1/-1">${esc(st.err)}</div>` : ""}</div>
    ${themes.length > 1 ? `<div class="chips"><button class="chip" data-br-theme="" aria-pressed="${!st.theme}">Tous les thèmes<span class="n">${all.length}</span></button>${themes.map((t) => `<button class="chip" data-br-theme="${t}" aria-pressed="${st.theme === t}">${esc(topicShort(t))}<span class="n">${all.filter((d) => d.theme === t).length}</span></button>`).join("")}</div>` : ""}
    ${xs.length ? xs.map((d) => brCard(d, byP[d.pmid])).join("") : `<div class="empty">Aucun brouillon en attente. Les prochains seront préparés à la prochaine veille.</div>`}
  </div>`;
}
async function brClick(t) {
  const d = t.dataset, st = state.br; if (!st) return false;
  if ("brctx" in d) { t.setAttribute("aria-pressed", t.getAttribute("aria-pressed") !== "true"); return true; }
  if ("brTheme" in d) st.theme = d.brTheme;
  else if (d.brAct) {
    const all = await ensureDrafts(); const draft = all.find((x) => x.pmid === d.pmid); const el = t.closest("[data-brcard]");
    const fiche = brReadForm(el, draft.fiche);
    if (d.brAct === "valider" && (!fiche.title_fr || !fiche.l1 || !fiche.ctx.length)) { st.err = "Titre, résumé express et au moins un sous-groupe sont nécessaires pour valider."; rerender(); return true; }
    brStore.set([...brStore.get().filter((x) => x.pmid !== d.pmid), { theme: draft.theme, pmid: d.pmid, action: d.brAct, fiche: d.brAct === "valider" ? fiche : undefined }]); st.err = st.msg = "";
  }
  else if (d.brUndo) brStore.set(brStore.get().filter((x) => x.pmid !== d.brUndo));
  else if ("brToken" in d) { const v = $("#br-token")?.value.trim(); if (v && !v.startsWith("•")) store.set("gh-token", v); }
  else if ("brTokenDel" in d) store.set("gh-token", "");
  else if ("brExport" in d) {
    const blob = new Blob([JSON.stringify(brStore.get(), null, 1)], { type: "application/json" }); const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `decisions-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`; a.click();
    st.msg = "Fichier téléchargé : déposez-le dans data/brouillons/decisions/ du dépôt (ou donnez-le à Claude lors de la prochaine veille)."; }
  else if ("brPublish" in d) {
    const decs = brStore.get(); const R = D.repo; st.busy = true; st.err = st.msg = ""; rerender();
    try {
      const name = `data/brouillons/decisions/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      const content = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(decs, null, 1))));
      const r = await fetch(`https://api.github.com/repos/${R.owner}/${R.name}/contents/${name}`, { method: "PUT", headers: { Authorization: `Bearer ${store.get("gh-token", "")}`, Accept: "application/vnd.github+json" },
        body: JSON.stringify({ message: `Brouillons : ${decs.filter((x) => x.action === "valider").length} fiche(s) validée(s), ${decs.filter((x) => x.action === "exclure").length} exclusion(s)`, content, branch: R.branch }) });
      if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "Jeton GitHub refusé (vérifiez sa validité et la permission Contents en écriture)." : `GitHub : erreur ${r.status}`);
      brStore.set([]); st.msg = "Décisions publiées. Le site sera mis à jour d'ici quelques minutes (application des décisions puis reconstruction).";
    } catch (x) { st.err = x.message; }
    st.busy = false;
  }
  else return false;
  rerender(); return true;
}

/* ---------------- routage & événements ---------------- */
async function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!isSoon() && !LOADED.has(state.topic)) {
    app().innerHTML = `<div class="empty">Chargement de ${esc(topic().label)}…</div>`;
    try { await ensureTopic(state.topic); } catch { app().innerHTML = `<div class="empty">Impossible de charger ce thème. Rechargez la page.</div>`; return; }
    renderTopics();
  }
  if (h.startsWith("article-")) {
    const id = h.slice(8);
    if (!byId(id)) for (const t of D.topics.filter((x) => !isSoon(x))) { await ensureTopic(t.id); if (byId(id)) break; }
    return viewArticle(id);
  }
  if (h.startsWith("appareil-")) return viewDevices(h.slice(9));
  if (h === "appareils") return viewDevices();
  if (h.startsWith("patient-")) return viewPatient(h.slice(8));
  if (h === "patients") return viewPatientsList();
  if (h === "brouillons") return viewBrouillons();
  if (h === "alertes" || h.startsWith("alertes?")) return viewAlertes(new URLSearchParams(h.split("?")[1] || ""));
  if (isSoon() && h !== "methode") return viewSoon(NAV_LABEL[h] ? h : "accueil");
  await ({ publications: viewPubs, syntheses: viewSyntheses, essais: viewEssais, parametres: viewParams, comparer: viewCompare, methode: viewMethode }[h] || viewHome)();
  if (!h.startsWith("article-")) $("#selbar")?.toggleAttribute("hidden", !state.selected.size || h === "comparer");
}
async function rerender() { const y = scrollY; await route(); scrollTo(0, y); updateSelbar(); }
function updateSelbar() {
  const bar = $("#selbar"); const n = state.selected.size; store.set("selected", [...state.selected]);
  bar.hidden = !n || location.hash === "#comparer"; $("#selcount").textContent = n;
}

addEventListener("hashchange", () => { route(); updateSelbar(); if (!location.hash.startsWith("#article-")) scrollTo(0, 0); });
document.addEventListener("click", async (e) => {
  const t = e.target.closest("button, [data-sel]"); if (!t) return;
  const d = t.dataset;
  if (Object.keys(d).some((k) => k.startsWith("al"))) { e.preventDefault(); await alClick(t); return; }
  if (Object.keys(d).some((k) => k.startsWith("br"))) { e.preventDefault(); await brClick(t); return; }
  if (d.topic) { const h = location.hash.slice(1).split("?")[0]; if (!["accueil", "publications", "syntheses", "essais", ""].includes(h) && !h.startsWith("article-")) history.replaceState(null, "", "#accueil"); setTopic(d.topic); return; }
  if (d.sub) { for (const k in state.f) state.f[k] = state.f[k] instanceof Set ? new Set() : (typeof state.f[k] === "boolean" ? false : ""); state.f.ctx.add(d.sub); state.filtersOpen = true; location.hash = "publications"; return; }
  if ("morelist" in d) { state.limit += 120; rerender(); return; }
  if (d.f || d.preset || "reset" in d) state.limit = 60;
  if (d.read) { state.level = +d.read; state.cardLevel.clear(); store.set("level", state.level); rerender(); }
  else if (d.aread) { state.cardLevel.set(location.hash.slice(9), +d.aread); rerender(); }
  else if (d.more) { state.cardLevel.set(d.more, Math.min(3, (state.cardLevel.get(d.more) || state.level) + 1)); rerender(); }
  else if (d.less) { state.cardLevel.set(d.less, 1); rerender(); }
  else if (d.f) { const set = state.f[d.f]; const v = ["years", "levels"].includes(d.f) ? +d.v : d.v; set.has(v) ? set.delete(v) : set.add(v); rerender(); }
  else if (d.preset) {
    const p = d.preset; const td = today();
    if (p === "7j") { state.f.from = iso(new Date(Date.now() - 7 * 864e5)); state.f.to = td; }
    else if (p === "30j") { state.f.from = iso(new Date(Date.now() - 30 * 864e5)); state.f.to = td; }
    else { state.f.from = `${p}-01-01`; state.f.to = `${p}-12-31`; }
    rerender();
  }
  else if ("reset" in d) { for (const k in state.f) state.f[k] = state.f[k] instanceof Set ? new Set() : (typeof state.f[k] === "boolean" ? false : ""); state.q = ""; $("#q").value = ""; rerender(); }
  else if ("togglefilters" in d) { state.filtersOpen = !state.filtersOpen; $(".filters").dataset.collapsed = String(!state.filtersOpen); }
  else if (d.syn) { state.synTab = d.syn; rerender(); }
  else if ("print" in d) { print(); }
  else if ("copylink" in d) { try { await navigator.clipboard.writeText(location.href); t.textContent = "Lien copié"; } catch { t.textContent = location.href; } }
  else if (d.parscope) { state.parScope = d.parscope; rerender(); }
  else if (d.devkind) { state.devKind = d.devkind; location.hash = "appareils"; rerender(); }
  else if ("devtopic" in d) { state.devTopic = d.devtopic; rerender(); }
  else if (d.esstab) { state.essTab = d.esstab; rerender(); }
  else if ("essctx" in d) { state.essCtx = d.essctx; rerender(); }
  else if (d.mode) { state.cmp.mode = d.mode; rerender(); }
  else if (d.pp) {
    const P = state.cmp[d.pp]; const y = d.y;
    if (y === "s1") Object.assign(P, { from: weekRange("2026-S01", "2026-S20")[0], to: weekRange("2026-S01", "2026-S20")[1], label: "Semaines 1 à 20 de 2026" });
    else if (y === "4w") Object.assign(P, { from: iso(new Date(Date.now() - 28 * 864e5)), to: today(), label: "4 dernières semaines" });
    else Object.assign(P, { from: `${y}-01-01`, to: `${y}-12-31`, label: y });
    rerender();
  }
  else if (d.clearsel) { const P = state.cmp[d.clearsel]; delete P.pmids; rerender(); }
  else if (d.zoom) { pdfZoom = Math.max(0.6, Math.min(2.6, pdfZoom + 0.25 * +d.zoom)); const a = byId(location.hash.slice(9)); if (a?.pdf) { $("#pages").innerHTML = '<p class="muted">Mise à l\'échelle…</p>'; renderPdf(a.pdf); } }
  else if (d.copy || d.cite) {
    const text = d.copy ? $(d.copy).value : (() => { const a = byId(d.cite); return `${(a.authors || []).join(", ")}. ${a.title} ${a.journal_abbr}. ${a.date.slice(0, 4)}. ${a.doi ? "doi:" + a.doi + ". " : ""}PMID: ${a.pmid}.`; })();
    try { await navigator.clipboard.writeText(text); t.textContent = "Copié"; }
    catch { if (d.copy) { $(d.copy).select(); } t.textContent = "Sélectionnez et copiez (Ctrl+C)"; }
  }
  else if (d.selcompare != null) {
    state.cmp = state.cmp || cmpDefault();
    if (d.selcompare === "merge") { state.cmp.mode = "merge"; state.cmp.A = { ...state.cmp.A, pmids: [...state.selected] }; }
    else { state.cmp.mode = "compare"; state.cmp.B = { ...state.cmp.B, pmids: [...state.selected] }; }
    location.hash = "comparer";
  }
  else if ("selclear" in d) { state.selected.clear(); rerender(); }
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.sel) { t.checked ? state.selected.add(t.dataset.sel) : state.selected.delete(t.dataset.sel); updateSelbar(); }
  else if (t.id === "essreg") { state.essReg = t.value; rerender(); }
  else if (t.id === "al-consent" && state.alert) state.alert.consent = t.checked;
  else if (t.id === "f-from" || t.id === "f-to") { state.f[t.id === "f-from" ? "from" : "to"] = t.value; rerender(); }
  else if (t.id === "f-week" && t.value) { const [a, b] = weekRange(t.value, t.value); state.f.from = a; state.f.to = b; state.sort = "date"; rerender(); }
  else if (t.id === "f-pdf" || t.id === "f-key") { state.f[t.id.slice(2)] = t.checked; rerender(); }
  else if (t.id === "sort") { state.sort = t.value; rerender(); }
  else if (t.id === "topic") setTopic(t.value);
  else if (t.dataset.wk) { const [id, side] = t.dataset.wk.split("-"); const P = state.cmp[id]; const other = $(`[data-wk="${id}-${side === "from" ? "to" : "from"}"]`).value;
    const [a, b] = weekRange(side === "from" ? t.value : other, side === "from" ? other : t.value); Object.assign(P, { from: a, to: b, label: `${weekOf(a).key.replace("-S", " S")} → ${weekOf(b).key.replace("-S", " S")}` }); rerender(); }
  else if (t.dataset.pd) { const [id, side] = t.dataset.pd.split("-"); const P = state.cmp[id]; P[side] = t.value; P.label = ""; rerender(); }
});
let qTimer;
let essT; document.addEventListener("input", (e) => {
  if (e.target.id === "al-email" && state.alert) { state.alert.email = e.target.value; return; }
  if (e.target.id !== "essq" && e.target.id !== "devq") return; clearTimeout(essT); const id = e.target.id;
  essT = setTimeout(async () => { state[id === "essq" ? "essQ" : "devQ"] = e.target.value; const pos = e.target.selectionStart; await rerender(); const i = $("#" + id); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }, 220);
});
$("#q").addEventListener("input", (e) => {
  clearTimeout(qTimer); qTimer = setTimeout(() => {
    state.q = e.target.value.trim(); if (state.q && state.sort === "date") state.sort = "pertinence"; if (!state.q && state.sort === "pertinence") state.sort = "date";
    if (location.hash !== "#publications") location.hash = "publications"; else rerender();
  }, 160);
});
document.addEventListener("keydown", (e) => { if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); $("#q").focus(); } });

/* thème clair / sombre : choix mémorisé, sinon réglage du système */
function setMenu(open) { document.body.classList.toggle("menu-open", open); $("#scrim").hidden = !open; $("#menu-btn")?.setAttribute("aria-expanded", String(open)); }
$("#menu-btn")?.addEventListener("click", () => setMenu(true));
$("#menu-close")?.addEventListener("click", () => setMenu(false));
$("#scrim")?.addEventListener("click", () => setMenu(false));
addEventListener("hashchange", () => setMenu(false));
addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false); });
$("#side-find")?.addEventListener("input", () => renderTopics());
const sideBtn = $("#side-toggle");
function applySide(off) { document.body.classList.toggle("side-off", off); sideBtn?.setAttribute("aria-expanded", String(!off)); sideBtn?.setAttribute("aria-label", off ? "Afficher le menu" : "Masquer le menu"); }
applySide(store.get("side-off", false));
sideBtn?.addEventListener("click", () => { const off = !document.body.classList.contains("side-off"); store.set("side-off", off); applySide(off); });
const themeBtn = $("#theme-toggle");
const sysDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
function applyTheme(t) { if (t) document.documentElement.setAttribute("data-theme", t); themeBtn?.setAttribute("aria-pressed", String((t || (sysDark() ? "dark" : "light")) === "dark")); }
applyTheme(store.get("theme", null));
themeBtn?.addEventListener("click", () => { const cur = document.documentElement.getAttribute("data-theme") || (sysDark() ? "dark" : "light"); const next = cur === "dark" ? "light" : "dark"; store.set("theme", next); applyTheme(next); });
if (!D.topics.some((t) => t.id === state.topic)) state.topic = D.topics[0].id;
renderTopics(); route(); updateSelbar();
})();
