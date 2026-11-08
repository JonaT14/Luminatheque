/* Luminathèque — fiches patients : illustrations et mise en page (SVG dessinés à la main, sans dépendance). */
(function () {
  const SKIN = { f: "#f6d4bf", s: "#e8b394", l: "#c98b6b", d: "#fbe6d8" };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let uid = 0;

  /* ---------- parties du corps (viewBox 360 × 260) : forme + point visé ---------- */
  const BODY = {
    bouche: { t: [180, 150], svg: `
      <ellipse cx="180" cy="150" rx="118" ry="96" fill="${SKIN.f}"/>
      <path d="M92 150c20-34 56-50 88-50s68 16 88 50c-20 40-56 60-88 60s-68-20-88-60z" fill="#c2414b"/>
      <path d="M100 150c22-26 52-38 80-38s58 12 80 38c-22 30-52 46-80 46s-58-16-80-46z" fill="#5a1620"/>
      <path d="M118 128c16-10 40-16 62-16s46 6 62 16l-6 12H124z" fill="#fff"/>
      <path d="M140 116v24M160 112v28M180 111v29M200 112v28M220 116v24" stroke="#e9e1dc" stroke-width="2"/>
      <path d="M134 176c14 12 30 18 46 18s32-6 46-18c-12-14-28-20-46-20s-34 6-46 20z" fill="#e8737e"/>
      <path d="M180 162v26" stroke="#c9505c" stroke-width="2" stroke-linecap="round"/>
      <path d="M92 150c20-34 56-50 88-50s68 16 88 50" fill="none" stroke="#a8323c" stroke-width="5" stroke-linecap="round"/>` },
    torse: { t: [146, 150], svg: `
      <path d="M70 250c4-60 12-110 40-140 18-20 46-28 70-28s52 8 70 28c28 30 36 80 40 140z" fill="${SKIN.f}"/>
      <path d="M150 82c0-26 14-44 30-44s30 18 30 44" fill="${SKIN.f}"/>
      <path d="M96 150c10 36 40 54 62 46M264 150c-10 36-40 54-62 46" fill="none" stroke="${SKIN.l}" stroke-width="3" stroke-linecap="round"/>
      <path d="M110 112c24-8 46-8 70 0 24-8 46-8 70 0" fill="none" stroke="${SKIN.s}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="150" cy="176" r="4" fill="${SKIN.l}"/><circle cx="212" cy="176" r="4" fill="${SKIN.l}"/>` },
    main: { t: [168, 120], svg: `
      <path d="M110 250l6-92c-14-22-26-46-28-62-2-12 12-16 20-6l22 34V52c0-12 18-12 18 0v62-78c0-12 18-12 18 0v78-70c0-12 18-12 18 0v72-56c0-12 18-12 18 0v108c0 30-10 52-24 70l-2 28z" fill="${SKIN.f}" stroke="${SKIN.l}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M140 160c14 8 34 8 52 0" fill="none" stroke="${SKIN.s}" stroke-width="3" stroke-linecap="round"/>
      <path d="M148 70v-14M184 64v-18M220 74v-14" stroke="${SKIN.s}" stroke-width="2" stroke-linecap="round"/>
      <path d="M156 96c4 30 14 52 30 70M200 100c-2 28-6 48-14 66" fill="none" stroke="#e0596b" stroke-width="2.5" stroke-dasharray="3 5" stroke-linecap="round" opacity=".8"/>` },
    bras: { t: [120, 128], svg: `
      <path d="M40 92c30-18 70-24 110-18l130 8c22 2 36 18 36 36s-16 32-38 32l-130-2c-44 0-82-6-110-22z" fill="${SKIN.f}"/>
      <path d="M160 86c40 4 80 6 120 8M160 166c40 0 80-2 120-4" fill="none" stroke="${SKIN.s}" stroke-width="3" stroke-linecap="round"/>
      <path d="M150 74c30-6 60-4 80 4 20 8 20 74 0 86-24 12-60 10-80 4" fill="#f2c4ab" opacity=".9"/>
      <path d="M300 104c18-6 30 0 34 10M302 152c18 4 28 0 32-10" fill="none" stroke="${SKIN.l}" stroke-width="3" stroke-linecap="round"/>
      <path d="M96 100c-16 10-22 26-18 40" fill="none" stroke="${SKIN.l}" stroke-width="3" stroke-linecap="round"/>` },
    genou: { t: [184, 128], svg: `
      <path d="M30 70c40-6 100-4 150 10 16 4 28 18 30 34l6 120h-58l-8-96c-40 0-90-4-126-12z" fill="${SKIN.f}"/>
      <path d="M150 248l-8-96" stroke="${SKIN.s}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="190" cy="118" rx="26" ry="30" fill="${SKIN.d}" stroke="${SKIN.l}" stroke-width="3"/>
      <path d="M176 104c8-6 20-6 28 0" fill="none" stroke="${SKIN.s}" stroke-width="3" stroke-linecap="round"/>
      <path d="M216 236h40c8 0 10 12 2 14h-48" fill="${SKIN.f}"/>` },
    coude: { t: [196, 150], svg: `
      <path d="M30 210c40-14 110-30 160-46 16-6 26-20 22-36L178 40c-4-14 12-22 22-12l50 112c12 30-4 56-34 68-50 18-120 34-176 46z" fill="${SKIN.f}" stroke="${SKIN.l}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M100 196c40-10 70-18 96-28" fill="none" stroke="${SKIN.s}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="198" cy="150" r="13" fill="${SKIN.d}" stroke="${SKIN.l}" stroke-width="2.5"/>` },
    machoire: { t: [214, 118], svg: `
      <path d="M150 28c60-6 116 30 120 92 2 30-8 54-28 66l-8 46H160l-6-26c-24 2-46-4-54-18-6-10 2-18 0-26-10-4-16-12-10-20l12-18c-6-6-6-14 2-18 0-46 20-74 46-78z" fill="${SKIN.f}" stroke="${SKIN.l}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M112 174c26 10 58 8 90-8l40-54" fill="none" stroke="${SKIN.s}" stroke-width="3" stroke-linecap="round"/>
      <path d="M232 92c10-10 24-8 28 6 4 12-4 24-16 22" fill="${SKIN.d}" stroke="${SKIN.l}" stroke-width="3"/>
      <circle cx="216" cy="118" r="10" fill="none" stroke="#e0596b" stroke-width="2.5" stroke-dasharray="3 3"/>
      <path d="M150 86c8-4 16-4 22 2" fill="none" stroke="${SKIN.l}" stroke-width="3" stroke-linecap="round"/>` },
    pied: { t: [170, 196], svg: `
      <path d="M90 30h56l6 120c20 10 70 14 112 30 30 12 34 46 4 56-64 6-140 6-188-4-20-4-22-20-16-40z" fill="${SKIN.f}" stroke="${SKIN.l}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M260 182c8 4 14 10 16 18M244 186c6 4 10 10 12 16" fill="none" stroke="${SKIN.l}" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="170" cy="212" rx="20" ry="9" fill="#d9475a"/><ellipse cx="170" cy="212" rx="11" ry="5" fill="#f08a8f"/>` },
    tete: { t: [180, 108], cap: true, svg: `
      <ellipse cx="180" cy="160" rx="84" ry="92" fill="${SKIN.f}"/>
      <path d="M100 150c-4-56 34-92 80-92s84 36 80 92c-10-24-26-36-40-40-12 14-30 18-46 10-20 10-46 12-74 30z" fill="#6b4a3a"/>
      <path d="M130 96l-6-12M150 86l-2-14M170 82v-14M190 82l2-14M210 86l6-12M230 96l8-10" stroke="#6b4a3a" stroke-width="3" stroke-linecap="round"/>
      <path d="M152 186c10 8 46 8 56 0" fill="none" stroke="${SKIN.l}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="150" cy="160" r="5" fill="#5a3e33"/><circle cx="210" cy="160" r="5" fill="#5a3e33"/>` },
    fleur: { t: [180, 140], svg: `
      ${[0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="180" cy="92" rx="26" ry="52" fill="#f6b6c8" opacity=".85" transform="rotate(${i * 60} 180 140)"/>`).join("")}
      ${[0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="180" cy="104" rx="16" ry="36" fill="#fbd3df" transform="rotate(${30 + i * 60} 180 140)"/>`).join("")}
      <circle cx="180" cy="140" r="20" fill="#f9e2b0"/><circle cx="180" cy="140" r="9" fill="#f2c56a"/>
      <path d="M180 200c0 20-4 36-12 52M180 230c14-14 32-18 46-14" fill="none" stroke="#5aa36e" stroke-width="4" stroke-linecap="round"/>` },
    oeil: { t: [180, 132], svg: `
      <path d="M40 132c40-62 90-92 140-92s100 30 140 92c-40 62-90 92-140 92S80 194 40 132z" fill="#fff" stroke="${SKIN.l}" stroke-width="4"/>
      <circle cx="180" cy="132" r="58" fill="#3f8fa0"/><circle cx="180" cy="132" r="58" fill="none" stroke="#2c6c79" stroke-width="5"/>
      ${Array.from({ length: 18 }, (_, i) => `<path d="M180 132l${(52 * Math.cos(i / 18 * 6.283)).toFixed(1)} ${(52 * Math.sin(i / 18 * 6.283)).toFixed(1)}" stroke="#6fb4c2" stroke-width="2"/>`).join("")}
      <circle cx="180" cy="132" r="24" fill="#122329"/><circle cx="168" cy="120" r="8" fill="#fff" opacity=".85"/>
      <path d="M40 132c40-62 90-92 140-92s100 30 140 92" fill="none" stroke="${SKIN.s}" stroke-width="10" stroke-linecap="round" opacity=".55"/>` },
    "oeil-enfant": { t: [128, 140], svg: `
      <ellipse cx="180" cy="150" rx="128" ry="104" fill="${SKIN.f}"/>
      <path d="M70 86c20-46 70-64 110-64s92 18 110 64c-30-20-60-24-110-24S96 66 70 86z" fill="#4b3329"/>
      <circle cx="128" cy="140" r="38" fill="#fff" stroke="#2f6fd6" stroke-width="6"/><circle cx="232" cy="140" r="38" fill="#fff" stroke="#2f6fd6" stroke-width="6"/>
      <path d="M166 140h28" stroke="#2f6fd6" stroke-width="6" stroke-linecap="round"/>
      <circle cx="128" cy="142" r="16" fill="#3f6d8c"/><circle cx="128" cy="142" r="7" fill="#101c24"/><circle cx="232" cy="142" r="16" fill="#3f6d8c"/><circle cx="232" cy="142" r="7" fill="#101c24"/>
      <path d="M150 210c18 14 42 14 60 0" fill="none" stroke="${SKIN.l}" stroke-width="4" stroke-linecap="round"/>` },
    dent: { t: [180, 176], svg: `
      <path d="M40 176c40-22 90-28 140-28s100 6 140 28v84H40z" fill="#f2a5ae"/>
      <path d="M126 70c18-22 34-16 54-6 20-10 36-16 54 6 18 22 12 58 0 82-8 16-10 36-14 60-4 20-20 20-22 0l-8-44c-2-10-18-10-20 0l-8 44c-2 20-18 20-22 0-4-24-6-44-14-60-12-24-18-60 0-82z" fill="#fffdf8" stroke="#d9cfc4" stroke-width="3"/>
      <path d="M150 88c10-6 20-6 30 0 10-6 20-6 30 0" fill="none" stroke="#ebe2d6" stroke-width="3" stroke-linecap="round"/>
      <path d="M40 176c40-22 90-28 140-28s100 6 140 28" fill="none" stroke="#e07c88" stroke-width="5" stroke-linecap="round"/>` },
    cerveau: { t: [176, 104], cap: true, svg: `
      <path d="M110 220c-30-20-46-56-40-96 8-54 52-88 104-88 60 0 104 44 104 100 0 24-8 44-22 58l6 46h-60l-4-22c-30 4-62 2-88 2z" fill="${SKIN.f}" stroke="${SKIN.l}" stroke-width="3"/>
      <path d="M100 118c-6-40 26-70 72-72 46-2 82 26 84 68 2 30-20 46-46 46-12 14-38 16-54 4-26 8-52-10-56-46z" fill="#f7c6cf" stroke="#e08e9c" stroke-width="3"/>
      <path d="M126 86c14-8 26-4 32 6M180 68c-4 14 4 28 18 30M210 112c-14 0-22 10-20 22M140 128c10-10 26-10 34 0M232 96c8 8 8 20 0 28" fill="none" stroke="#e08e9c" stroke-width="3" stroke-linecap="round"/>` },
  };

  function device(tx, ty, color, id, cap) {
    if (cap) {
      const leds = Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.12 + i * 0.095); return [tx - 112 * Math.cos(a), ty - 6 - 70 * Math.sin(a)]; });
      return `<path d="M${tx - 118} ${ty + 4}c0-70 52-108 118-108s118 38 118 108" fill="none" stroke="#3b3f4a" stroke-width="16" stroke-linecap="round" opacity=".9"/>
        ${leds.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" fill="url(#g${id})"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#fff"/>`).join("")}`;
    }
    const sx = Math.min(292, tx + 110), sy = Math.max(48, ty - 100);
    const ang = Math.atan2(ty - sy, tx - sx) * 180 / Math.PI;
    const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const w0 = 9, w1 = 30;
    const ray = (k, op) => `<path d="M${(sx + nx * w0 * k).toFixed(1)} ${(sy + ny * w0 * k).toFixed(1)}L${(tx + nx * w1 * k).toFixed(1)} ${(ty + ny * w1 * k).toFixed(1)}L${(tx - nx * w1 * k).toFixed(1)} ${(ty - ny * w1 * k).toFixed(1)}L${(sx - nx * w0 * k).toFixed(1)} ${(sy - ny * w0 * k).toFixed(1)}z" fill="url(#r${id})" opacity="${op}"/>`;
    return `${ray(1.6, .35)}${ray(1, .7)}${ray(.45, .95)}
      <g transform="translate(${sx} ${sy}) rotate(${ang})"><rect x="-6" y="-13" width="70" height="26" rx="13" transform="translate(-64 0)" fill="#2d313b"/><rect x="-14" y="-11" width="18" height="22" rx="6" fill="#4a505d"/><circle cx="2" cy="0" r="7" fill="${color}"/><circle cx="2" cy="0" r="3" fill="#fff"/></g>`;
  }
  function sparkle(x, y, s, c) { return `<path d="M${x} ${y - s}C${x + s * .2} ${y - s * .2} ${x + s * .2} ${y - s * .2} ${x + s} ${y}C${x + s * .2} ${y + s * .2} ${x + s * .2} ${y + s * .2} ${x} ${y + s}C${x - s * .2} ${y + s * .2} ${x - s * .2} ${y + s * .2} ${x - s} ${y}C${x - s * .2} ${y - s * .2} ${x - s * .2} ${y - s * .2} ${x} ${y - s}z" fill="${c}"/>`; }

  function hero(key, color) {
    const b = BODY[key] || BODY.bouche, id = ++uid, [tx, ty] = b.t;
    return `<svg class="pt-hero" viewBox="0 0 360 260" role="img" aria-hidden="true">
      <defs><radialGradient id="g${id}"><stop offset="0" stop-color="${color}" stop-opacity=".95"/><stop offset=".55" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
        <linearGradient id="r${id}" gradientUnits="userSpaceOnUse" x1="${Math.min(292, tx + 110)}" y1="${Math.max(48, ty - 100)}" x2="${tx}" y2="${ty}"><stop offset="0" stop-color="${color}" stop-opacity=".9"/><stop offset="1" stop-color="${color}" stop-opacity=".05"/></linearGradient>
        <radialGradient id="bg${id}" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="${color}" stop-opacity=".18"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>
      <rect width="360" height="260" fill="url(#bg${id})"/>
      <circle cx="56" cy="44" r="5" fill="${color}" opacity=".25"/><circle cx="322" cy="214" r="8" fill="${color}" opacity=".18"/><circle cx="34" cy="206" r="3" fill="${color}" opacity=".3"/>
      ${b.svg}
      <circle cx="${tx}" cy="${ty}" r="46" fill="url(#g${id})" class="pt-pulse"/>
      ${device(tx, ty, color, id, b.cap)}
      ${sparkle(tx - 40, ty - 34, 7, "#fff")}${sparkle(tx + 34, ty + 30, 5, "#fff")}${sparkle(tx + 46, ty - 20, 4, color)}
    </svg>`;
  }

  /* ---------- schéma « comment ça marche » ---------- */
  function mechanism() {
    const id = ++uid;
    const layers = [["Épiderme", "#f3d2bd", 22], ["Derme", "#eeb6aa", 44], ["Hypoderme", "#f6e2a6", 40], ["Muscle", "#d77a74", 54]];
    let y = 50; const L = layers.map(([n, c, h]) => { const r = `<rect x="20" y="${y}" width="250" height="${h}" fill="${c}"/><text x="262" y="${y + h / 2 + 4}" text-anchor="end" class="pt-lab">${n}</text>`; y += h; return r; }).join("");
    return `<svg class="pt-mech" viewBox="0 0 720 290" role="img" aria-label="La lumière rouge et infrarouge pénètre la peau, stimule les mitochondries des cellules, ce qui réduit l'inflammation et aide la réparation des tissus.">
      <defs><linearGradient id="red${id}" gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="140"><stop offset="0" stop-color="#ff3b3b"/><stop offset="1" stop-color="#ff3b3b" stop-opacity="0"/></linearGradient>
        <linearGradient id="ir${id}" gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="210"><stop offset="0" stop-color="#8b1e3f"/><stop offset="1" stop-color="#8b1e3f" stop-opacity=".1"/></linearGradient>
        <radialGradient id="mg${id}"><stop offset="0" stop-color="#fff6d6"/><stop offset="1" stop-color="#ffd46b" stop-opacity="0"/></radialGradient></defs>
      <g>${L}</g>
      <rect x="20" y="50" width="250" height="160" fill="none" stroke="#d2a48f" stroke-width="1.5" rx="2"/>
      <path d="M66 8h28l-6 128h-16z" fill="url(#red${id})"/><path d="M80 120l-12 16h24z" fill="#ff3b3b" opacity=".0"/>
      <path d="M206 8h28l-6 196h-16z" fill="url(#ir${id})"/>
      <text x="96" y="26" class="pt-lab b" fill="#d72c2c">Rouge</text><text x="96" y="40" class="pt-lab">630–700 nm</text>
      <text x="240" y="26" class="pt-lab b" fill="#8b1e3f">Infrarouge</text><text x="240" y="40" class="pt-lab">780–1 000 nm</text>
      <text x="145" y="240" text-anchor="middle" class="pt-lab">L'infrarouge va plus profond que le rouge</text>
      <path d="M270 150 330 120M270 196 330 220" stroke="#b9bdc8" stroke-width="1.5" stroke-dasharray="4 4"/>
      <circle cx="420" cy="170" r="92" fill="#fff1ec" stroke="#f0c9bc" stroke-width="2"/>
      <circle cx="420" cy="170" r="70" fill="url(#mg${id})"/>
      <ellipse cx="420" cy="172" rx="58" ry="32" fill="#f6a3a0" stroke="#d9616a" stroke-width="3"/>
      <path d="M376 172c6-16 12-16 16 0s10 16 16 0 10-16 16 0 10 16 16 0 10-16 16 0" fill="none" stroke="#d9616a" stroke-width="3" stroke-linecap="round"/>
      <path d="M420 74l-6 22 10-4-6 22" fill="none" stroke="#ff3b3b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${sparkle(470, 130, 8, "#ffb800")}${sparkle(372, 214, 6, "#ffb800")}${sparkle(462, 214, 5, "#ffb800")}
      <text x="420" y="282" text-anchor="middle" class="pt-lab b">La mitochondrie, centrale énergétique de la cellule</text>
      ${[["Plus d'énergie (ATP)", "#e09a00", 70], ["Moins d'inflammation", "#2f8fe0", 130], ["Réparation des tissus", "#2fae5f", 190], ["Moins de douleur", "#8a5cf6", 250]].map(([t, c, yy]) => `<g transform="translate(540 ${yy - 22})"><rect width="170" height="40" rx="20" fill="${c}" opacity=".12"/><circle cx="20" cy="20" r="9" fill="${c}"/><text x="38" y="25" class="pt-lab b" fill="${c}">${t}</text></g>`).join("")}
      <path d="M514 170h18" stroke="#b9bdc8" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  /* ---------- calendrier des séances ---------- */
  function calendar(c, color) {
    const weeks = Math.min(c.semaines, 12), per = Math.min(c.par_semaine, 7);
    const days = per >= 5 ? [0, 1, 2, 3, 4, 5, 6].slice(0, per) : per === 3 ? [0, 2, 4] : per === 2 ? [0, 3] : per === 1 ? [1] : [0, 1, 2, 3];
    const W = 7 * 22 + 70, H = weeks * 22 + 30;
    return `<svg class="pt-cal" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.texte)}">
      ${["L", "M", "M", "J", "V", "S", "D"].map((d, i) => `<text x="${70 + i * 22 + 8}" y="14" text-anchor="middle" class="pt-lab">${d}</text>`).join("")}
      ${Array.from({ length: weeks }, (_, w) => `<text x="0" y="${34 + w * 22}" class="pt-lab">Sem. ${w + 1}</text>${Array.from({ length: 7 }, (_, d) => `<rect x="${70 + d * 22}" y="${22 + w * 22}" width="17" height="17" rx="5" fill="${days.includes(d) ? color : "#e7e9ee"}" opacity="${days.includes(d) ? .9 : .6}"/>`).join("")}`).join("")}
    </svg>${c.semaines > 12 ? `<p class="pt-note">… et ainsi de suite pendant ${c.semaines} semaines ou plus.</p>` : ""}`;
  }

  /* ---------- jauge du niveau de preuve ---------- */
  const LEVELS = [["non démontrée", "#d1493a", "Non démontrée"], ["incertaine", "#e09a00", "Incertaine"], ["prometteuse", "#1f6fd1", "Prometteuse"], ["recommandée", "#13895f", "Recommandée"]];
  function gauge(level) {
    const i = Math.max(0, LEVELS.findIndex((l) => l[0] === level)), cx = 120, cy = 116, r = 92;
    const arc = (a0, a1) => { const p = (a) => [cx - r * Math.cos(a), cy - r * Math.sin(a)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
    const seg = Math.PI / 4, ang = seg * i + seg / 2;
    return `<svg class="pt-gauge" viewBox="0 0 240 140" role="img" aria-label="Niveau de preuve : ${LEVELS[i][2]}">
      ${LEVELS.map(([, c], k) => `<path d="${arc(k * seg + .03, (k + 1) * seg - .03)}" stroke="${c}" stroke-width="20" fill="none" stroke-linecap="round" opacity="${k === i ? 1 : .22}"/>`).join("")}
      <path d="M${cx} ${cy}L${(cx - 70 * Math.cos(ang)).toFixed(1)} ${(cy - 70 * Math.sin(ang)).toFixed(1)}" stroke="#2b2f38" stroke-width="5" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="9" fill="#2b2f38"/>
      <text x="${cx}" y="${cy + 22}" text-anchor="middle" class="pt-lab b" fill="${LEVELS[i][1]}" style="font-size:15px">${LEVELS[i][2]}</text>
    </svg>`;
  }

  /* ---------- petites icônes des messages ---------- */
  const IC = {
    bouclier: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    douleur: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', valide: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    calendrier: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    main: '<path d="M7 11V5a1.5 1.5 0 0 1 3 0v5M10 10V4a1.5 1.5 0 0 1 3 0v6M13 10V5a1.5 1.5 0 0 1 3 0v7M16 12V8a1.5 1.5 0 0 1 3 0v6c0 4-3 7-7 7-3 0-5-2-6-4l-2-4c-.6-1.4 1.2-2.4 2.2-1.2L7 15"/>',
    lumiere: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    loupe: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', bras: '<path d="M4 9c4-2 9-2 13-1l3 1v5l-3 1c-4 1-9 1-13-1z"/>',
    marche: '<circle cx="13" cy="4" r="2"/><path d="M10 21l2-6 3 3v3M8 12l3-4 3 2 3 1M12 15l-1-5"/>',
    pansement: '<rect x="2" y="8" width="20" height="8" rx="4" transform="rotate(-30 12 12)"/><path d="M10 11h.01M14 13h.01"/>',
    cheveu: '<path d="M6 21c0-10 4-16 6-18M12 21c0-8 2-13 6-16M18 21c-1-6 0-10 2-13"/>', maison: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
    goutte: '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>', oeil: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    dent: '<path d="M7 3c2 0 3 1 5 1s3-1 5-1c3 0 4 4 3 7-1 2-1 5-2 9-.5 2-2.5 2-3 0l-1-4h-4l-1 4c-.5 2-2.5 2-3 0-1-4-1-7-2-9-1-3 0-7 3-7z"/>',
    cerveau: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3V4z"/>',
  };
  const icon = (k, c) => `<svg width="26" height="26" viewBox="0 0 24 24" style="stroke:${c}" aria-hidden="true">${IC[k] || IC.lumiere}</svg>`;

  window.LUMINA_PT = { hero, mechanism, calendar, gauge, icon, LEVELS };
})();
