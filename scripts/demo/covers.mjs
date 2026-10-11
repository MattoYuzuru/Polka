import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const out = path.join(root, "demo/covers");
await mkdir(out, { recursive: true });
const books = JSON.parse(
  await readFile(path.join(root, "demo/books.json"), "utf8"),
);
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const label = (s, x, y, size = 22, color = "#222", extra = "") =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${escape(s)}</text>`;
const frame = (bg, art, texts, index, foreground) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900" style="color:${foreground}"><defs><filter id="mist"><feGaussianBlur stdDeviation="40"/></filter></defs><rect width="600" height="900" fill="${bg}"/><g font-family="Georgia, 'Hiragino Mincho ProN', serif">${art}${texts}${label("POLKA", 44, 846, 18, "currentColor", 'letter-spacing="5"')}${label(String(index).padStart(2, "0"), 514, 846, 18, "currentColor")}</g><rect x="24" y="24" width="552" height="852" fill="none" stroke="currentColor" opacity=".2"/></svg>`;
const designs = [
  [
    "#f2e9d8",
    '<circle cx="303" cy="445" r="157" fill="#b83b36"/><path d="M106 485Q300 380 504 485M115 510Q300 405 495 510M143 535Q300 433 462 535" fill="none" stroke="#f2e9d8" stroke-width="2"/>',
    label("夏目 漱石", 44, 100, 26) +
      label("こ", 242, 370, 104, "#f2e9d8") +
      label("こ", 242, 477, 104, "#f2e9d8") +
      label("ろ", 242, 584, 104, "#f2e9d8") +
      label("K O K O R O", 44, 740, 22),
  ],
  [
    "#19274c",
    '<g stroke="#9eb9ef" fill="none"><path d="M42 688Q185 396 563 216M42 708Q203 416 563 236" stroke-width="2"/><path d="M102 291L268 406L408 292L477 446L309 601L166 516Z" opacity=".4"/></g>' +
      Array.from(
        { length: 38 },
        (_, i) =>
          `<circle cx="${50 + ((i * 127) % 500)}" cy="${215 + ((i * 173) % 450)}" r="${i % 5 === 0 ? 3 : 1.6}" fill="#f2dfae"/>`,
      ).join("") +
      '<g transform="translate(240 440) rotate(-35)"><rect width="122" height="50" rx="3" fill="#c5d4ef"/><path d="M15 12h18v16H15zM47 12h18v16H47zM79 12h18v16H79z" fill="#19274c"/><circle cx="24" cy="53" r="7" fill="#f2dfae"/><circle cx="101" cy="53" r="7" fill="#f2dfae"/></g>',
    label("宮沢 賢治", 44, 100, 25, "#f2dfae") +
      label("銀河鉄道", 44, 170, 58, "#f2dfae") +
      label("の夜", 44, 240, 58, "#f2dfae") +
      label("NIGHT ON THE", 44, 730, 21, "#f2dfae", 'letter-spacing="3"') +
      label("GALACTIC RAILROAD", 44, 765, 21, "#f2dfae", 'letter-spacing="3"'),
  ],
  [
    "#dc593b",
    '<g stroke="#f9e8bd" stroke-width="3" fill="none"><path d="M255 625h85l-14-174h-55ZM295 457V288M295 457L126 459M295 457L464 458M295 457L295 623"/><path d="M296 288l37 4-1 124-36 16ZM126 458l3-37 124 3 15 34ZM296 623l-37-4 1-124 36-16ZM464 458l-3 37-124-3-15-34Z"/><path d="M90 668Q180 629 260 657T500 660"/></g>',
    label("MIGUEL DE CERVANTES", 44, 100, 22, "#f9e8bd") +
      label("Don Quijote", 44, 190, 68, "#f9e8bd") +
      label("de la Mancha", 44, 253, 52, "#f9e8bd") +
      label("1605 / 1615", 44, 767, 22, "#f9e8bd"),
  ],
  [
    "#d9ded6",
    '<g filter="url(#mist)"><circle cx="165" cy="415" r="145" fill="#a3ada3"/><circle cx="454" cy="565" r="160" fill="#718277"/></g><path d="M304 346c-88 90-98 164-67 255h118c35-116 12-194-51-255Z" fill="#304b42"/><ellipse cx="303" cy="361" rx="37" ry="46" fill="#304b42"/>',
    label("MIGUEL DE UNAMUNO", 44, 100, 22, "#304b42") +
      label("Niebla", 44, 250, 106, "#304b42") +
      label("UNA NIVOLA", 44, 745, 22, "#304b42", 'letter-spacing="5"') +
      label("1914", 44, 780, 22, "#304b42"),
  ],
  [
    "#c5c7ef",
    '<g fill="none" stroke="#262650" stroke-width="2"><path d="M68 414L300 290L532 414L300 552Z"/><path d="M68 414V634L300 766L532 634V414M300 552V766M300 290V505" stroke-dasharray="6 7"/><circle cx="300" cy="418" r="93"/><path d="M207 418Q300 482 393 418M207 418Q300 354 393 418M300 325Q245 418 300 511M300 325Q355 418 300 511"/></g>',
    label("EDWIN A. ABBOTT", 44, 100, 24, "#262650") +
      label("Flatland", 44, 218, 99, "#262650") +
      label(
        "A ROMANCE OF MANY DIMENSIONS",
        44,
        265,
        18,
        "#262650",
        'letter-spacing="1"',
      ),
  ],
  [
    "#e8b952",
    '<g stroke="#302e29" fill="none" stroke-width="2"><path d="M300 440L161 522L440 522M161 522L83 615L238 615M440 522L365 615L517 615M83 615L52 690L116 690M238 615L206 690L270 690M365 615L333 690L398 690M517 615L485 690L549 690"/></g>' +
      [300, 161, 440, 83, 238, 365, 517]
        .map(
          (x, i) =>
            `<circle cx="${x}" cy="${i === 0 ? 440 : i < 3 ? 522 : 615}" r="14" fill="#302e29"/>`,
        )
        .join(""),
    label("ABELSON / SUSSMAN / SUSSMAN", 44, 94, 18) +
      label("Structure and", 44, 172, 47) +
      label("Interpretation", 44, 226, 47) +
      label("of Computer", 44, 280, 47) +
      label("Programs", 44, 334, 47) +
      label(
        "( define ( ideas )",
        44,
        758,
        23,
        "#302e29",
        'font-family="monospace"',
      ) +
      label(
        "  ( compose possibilities ) )",
        44,
        796,
        20,
        "#302e29",
        'font-family="monospace"',
      ),
  ],
  [
    "#252527",
    '<path d="M40 615L600 312V569L40 872Z" fill="#c84435"/><g stroke="#eee8d9" fill="none" opacity=".7"><path d="M82 489h426M82 523h426M82 557h426M132 439v222M182 439v222M232 439v222M282 439v222M332 439v222M382 439v222M432 439v222M482 439v222"/></g>',
    label("ЕВГЕНИЙ ЗАМЯТИН", 44, 100, 26, "#eee8d9") +
      label("МЫ", 42, 373, 208, "#eee8d9") +
      label("Д–503", 44, 758, 31, "#eee8d9") +
      label("РОМАН / 1924", 44, 798, 22, "#eee8d9"),
  ],
  [
    "#dee7eb",
    '<path d="M148 659Q348 570 423 355M221 625Q161 541 169 470M284 574Q381 568 438 492M330 516Q253 436 270 391M379 448Q437 436 459 374" fill="none" stroke="#688893" stroke-width="3"/><g fill="#688893"><ellipse cx="169" cy="477" rx="17" ry="44" transform="rotate(-25 169 477)"/><ellipse cx="415" cy="513" rx="17" ry="44" transform="rotate(53 415 513)"/><ellipse cx="274" cy="397" rx="15" ry="37" transform="rotate(-28 274 397)"/><ellipse cx="454" cy="385" rx="14" ry="36" transform="rotate(32 454 385)"/></g>',
    label("АЛЕКСАНДР ПУШКИН", 44, 100, 25, "#354e5b") +
      label("Евгений", 44, 219, 76, "#354e5b", 'font-style="italic"') +
      label("Онегин", 44, 306, 88, "#354e5b", 'font-style="italic"') +
      label("РОМАН В СТИХАХ", 44, 749, 23, "#354e5b", 'letter-spacing="3"') +
      label("1833", 44, 789, 22, "#354e5b"),
  ],
];
const covers = new Map(
  [
    "kokoro",
    "ginga",
    "quijote",
    "niebla",
    "flatland",
    "sicp",
    "we",
    "onegin",
  ].map((slug, index) => [
    slug,
    [...designs[index], [1, 2, 6].includes(index) ? "#eee8d9" : "#263532"],
  ]),
);
const additionalDesigns = {
  rashomon: [
    "#e3c18c",
    '<path d="M102 420h396v30H102zM132 448h40v230h-40zM428 448h40v230h-40zM82 395l218-66 218 66Z" fill="#7f3328"/><path d="M190 470h220v208H190z" fill="#28282b"/><g stroke="#f5ebd1" stroke-width="2">' +
      Array.from(
        { length: 24 },
        (_, i) => `<path d="M${70 + i * 20} 304l-55 412"/>`,
      ).join("") +
      "</g>",
    label("芥川 龍之介", 44, 100, 26, "#643027") +
      label("羅生門", 44, 235, 100, "#643027") +
      label("RASHŌMON / 1915", 44, 775, 23, "#643027"),
    "#643027",
  ],
  ningen: [
    "#ecd8d8",
    '<ellipse cx="300" cy="490" rx="139" ry="186" fill="#b95656"/><path d="M300 304v372c102-50 139-110 139-186S402 354 300 304Z" fill="#572d3e"/><path d="M225 455h45M330 455h45M248 585q52-35 104 0" fill="none" stroke="#ecd8d8" stroke-width="6"/><path d="M300 468v67" stroke="#ecd8d8" stroke-width="3"/>',
    label("太宰 治", 44, 100, 29, "#572d3e") +
      label("人間失格", 44, 220, 94, "#572d3e") +
      label("NO LONGER HUMAN", 44, 764, 23, "#572d3e", 'letter-spacing="2"'),
    "#572d3e",
  ],
  gakumon: [
    "#efe9d7",
    '<circle cx="310" cy="490" r="163" fill="#367d83"/><g stroke="#efe9d7" fill="none" stroke-width="3"><path d="M183 411q55-28 117 8q62-36 117-8v163q-55-28-117 8q-62-36-117-8ZM300 419v163"/><path d="M205 452l69 5M205 480l69 5M205 508l69 5M326 457l69-5M326 485l69-5M326 513l69-5"/></g>',
    label("福沢 諭吉", 44, 100, 28, "#28565c") +
      label("学問のすすめ", 44, 212, 72, "#28565c") +
      label(
        "LEARNING / INDEPENDENCE",
        44,
        756,
        20,
        "#28565c",
        'letter-spacing="1"',
      ) +
      label("1872–1876", 44, 793, 22, "#28565c"),
    "#28565c",
  ],
  ficciones: [
    "#273331",
    '<g stroke="#ddb879" fill="none" stroke-width="5"><path d="M88 338h424v350H88ZM127 377h346v272H127ZM166 416h268v194H166ZM205 455h190v116H205ZM244 494h112v38H244"/><path d="M300 338v78M434 494h78M300 571v117M88 494h117" stroke="#273331" stroke-width="12"/></g><circle cx="300" cy="514" r="8" fill="#ddb879"/>',
    label("JORGE LUIS BORGES", 44, 100, 24, "#ddb879") +
      label("Ficciones", 44, 229, 94, "#ddb879") +
      label("LABERINTOS / 1944", 44, 778, 24, "#ddb879", 'letter-spacing="2"'),
    "#ddb879",
  ],
  morel: [
    "#a9d7ce",
    '<circle cx="300" cy="471" r="162" fill="#e8efd9"/><path d="M55 590q70-45 140 0t140 0t140 0t140 0M55 625q70-45 140 0t140 0t140 0t140 0M55 660q70-45 140 0t140 0t140 0t140 0" stroke="#397571" fill="none" stroke-width="3"/><g fill="#397571"><circle cx="300" cy="421" r="27"/><path d="M272 450h56l15 107h-86Z"/><circle cx="216" cy="443" r="20" opacity=".35"/><path d="M196 465h40l12 81h-64Z" opacity=".35"/><circle cx="384" cy="443" r="20" opacity=".35"/><path d="M364 465h40l12 81h-64Z" opacity=".35"/></g>',
    label("ADOLFO BIOY CASARES", 44, 100, 22, "#2a5754") +
      label("La invención", 44, 190, 62, "#2a5754") +
      label("de Morel", 44, 262, 80, "#2a5754") +
      label("UNA ISLA / UN RECUERDO", 44, 773, 22, "#2a5754"),
    "#2a5754",
  ],
  selva: [
    "#284c3f",
    '<g fill="#6b9d64"><ellipse cx="105" cy="530" rx="33" ry="153" transform="rotate(-38 105 530)"/><ellipse cx="473" cy="508" rx="35" ry="150" transform="rotate(38 473 508)"/><ellipse cx="228" cy="607" rx="26" ry="126" transform="rotate(-24 228 607)"/><ellipse cx="377" cy="660" rx="28" ry="124" transform="rotate(32 377 660)"/></g><path d="M263 445c-42 41-45 135-8 166h86c31-72 18-148-25-166Z" fill="#e9ba59"/><path d="M315 440l80 26-74 18Z" fill="#e87942"/><circle cx="304" cy="457" r="6" fill="#284c3f"/>',
    label("HORACIO QUIROGA", 44, 100, 24, "#f1dcaa") +
      label("Cuentos", 44, 202, 83, "#f1dcaa") +
      label("de la selva", 44, 274, 68, "#f1dcaa") +
      label("OCHO HISTORIAS / 1918", 44, 783, 22, "#f1dcaa"),
    "#f1dcaa",
  ],
  frankenstein: [
    "#442a3a",
    '<path d="M325 292l-105 175h84l-59 110 148-166h-87l60-119Z" fill="#b6d1b2"/><g fill="none" stroke="#b6d1b2" stroke-width="3"><path d="M128 645v-34q0-79 79-92M472 645v-34q0-79-79-92M128 645h344M226 645v-49M374 645v-49"/><path d="M250 596q50 19 100 0M250 618q50 19 100 0"/></g>',
    label("MARY SHELLEY", 44, 100, 25, "#e7e3c9") +
      label("Frankenstein", 44, 219, 78, "#e7e3c9") +
      label("THE MODERN PROMETHEUS", 44, 270, 20, "#e7e3c9") +
      label("CREATION / RESPONSIBILITY", 44, 781, 20, "#e7e3c9"),
    "#e7e3c9",
  ],
  alice: [
    "#dbe8ed",
    '<g fill="#9fc0ca">' +
      Array.from(
        { length: 20 },
        (_, i) =>
          `<rect x="${90 + (i % 5) * 84}" y="${410 + Math.floor(i / 5) * 62}" width="84" height="62" opacity="${(i + Math.floor(i / 5)) % 2 ? 0.65 : 0.15}"/>`,
      ).join("") +
      '</g><g fill="#b64b50"><ellipse cx="302" cy="506" rx="59" ry="75"/><ellipse cx="272" cy="416" rx="18" ry="58" transform="rotate(-15 272 416)"/><ellipse cx="323" cy="411" rx="18" ry="58" transform="rotate(15 323 411)"/></g><circle cx="277" cy="492" r="5" fill="#dbe8ed"/><circle cx="322" cy="492" r="5" fill="#dbe8ed"/>',
    label("LEWIS CARROLL", 44, 100, 24, "#354e61") +
      label("Alice’s Adventures", 44, 185, 51, "#354e61") +
      label("in Wonderland", 44, 249, 63, "#354e61") +
      label("CURIOSITY / 1865", 44, 777, 24, "#354e61"),
    "#354e61",
  ],
  taocp: [
    "#e9e3d4",
    '<g stroke="#3256a5" stroke-width="3" fill="none"><rect x="224" y="410" width="152" height="76"/><path d="M300 486v45M300 531l91 65-91 65-91-65ZM300 661v57M209 596H126v-148h98M391 596h84"/><path d="M462 583l13 13-13 13M287 705l13 13 13-13"/></g>' +
      label("01", 267, 462, 34, "#3256a5", 'font-family="monospace"'),
    label("DONALD E. KNUTH", 44, 100, 24, "#3256a5") +
      label("The Art of", 44, 173, 57, "#3256a5") +
      label("Computer", 44, 234, 66, "#3256a5") +
      label("Programming", 44, 295, 66, "#3256a5") +
      label("FUNDAMENTAL ALGORITHMS", 44, 348, 20, "#3256a5") +
      label("VOLUME 1 / THIRD EDITION", 44, 792, 21, "#3256a5"),
    "#3256a5",
  ],
  amphibian: [
    "#0c747d",
    '<g stroke="#86c6c1" fill="none" stroke-width="3">' +
      Array.from(
        { length: 7 },
        (_, i) => `<path d="M40 ${395 + i * 45}q85-45 170 0t170 0t170 0"/>`,
      ).join("") +
      '</g><circle cx="300" cy="472" r="29" fill="#f2d4a0"/><path d="M281 503l-83 105 29 16 73-86 73 86 29-16-83-105ZM284 536l-26 165h32l10-111 10 111h32l-26-165Z" fill="#f2d4a0"/>',
    label("АЛЕКСАНДР БЕЛЯЕВ", 44, 100, 25, "#f2d4a0") +
      label("Человек-", 44, 202, 79, "#f2d4a0") +
      label("амфибия", 44, 294, 84, "#f2d4a0") +
      label("ДВА МИРА / 1928", 44, 790, 24, "#f2d4a0"),
    "#f2d4a0",
  ],
  underground: [
    "#d5d1ca",
    '<path d="M100 367h300v54H151v54h249v54H201v54h199v54H251v54h149v54H100Z" fill="#424248"/><rect x="400" y="367" width="84" height="378" fill="#b14e43"/><path d="M126 393h249M176 501h199M226 609h149M276 717h99" stroke="#d5d1ca" stroke-width="2"/>',
    label("ФЁДОР ДОСТОЕВСКИЙ", 44, 100, 24, "#39383f") +
      label("Записки", 44, 190, 76, "#39383f") +
      label("из подполья", 44, 263, 64, "#39383f") +
      label("ГОЛОС / СПОР / 1864", 44, 793, 23, "#39383f"),
    "#39383f",
  ],
  monday: [
    "#4c4268",
    '<circle cx="300" cy="538" r="145" fill="#dbc8a2"/><circle cx="300" cy="538" r="119" fill="none" stroke="#4c4268" stroke-width="2"/><path d="M300 435v103l74 45" stroke="#4c4268" stroke-width="7" fill="none"/><path d="M92 380l10 24 25 10-25 10-10 24-10-24-25-10 25-10ZM492 635l10 24 25 10-25 10-10 24-10-24-25-10 25-10Z" fill="#dbc8a2"/><path d="M360 351l12 30 32 12-32 12-12 30-12-30-32-12 32-12Z" fill="#bc9eb8"/>',
    label("АРКАДИЙ И БОРИС СТРУГАЦКИЕ", 44, 97, 18, "#efe4ce") +
      label("Понедельник", 44, 183, 66, "#efe4ce") +
      label("начинается", 44, 247, 68, "#efe4ce") +
      label("в субботу", 44, 312, 76, "#efe4ce") +
      label("НИИЧАВО / 1965", 44, 786, 24, "#efe4ce"),
    "#efe4ce",
  ],
};
for (const [slug, design] of Object.entries(additionalDesigns))
  covers.set(slug, design);
for (const book of books) {
  if (!covers.has(book.slug))
    throw new Error(`Missing cover design: ${book.slug}`);
}
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 600, height: 900 },
    deviceScaleFactor: 1,
  });
  for (let i = 0; i < books.length; i++) {
    const [bg, art, texts, foreground] = covers.get(books[i].slug);
    const svg = frame(bg, art, texts, i + 1, foreground);
    await writeFile(path.join(out, `${books[i].slug}.svg`), svg);
    await page.setContent(
      `<style>html,body{margin:0;width:600px;height:900px;color:${foreground}}</style>${svg}`,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, `${books[i].slug}.png`) });
  }
} finally {
  await browser.close();
}
console.log(`Created ${books.length} local covers in demo/covers.`);
