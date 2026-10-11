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
const frame = (bg, art, texts, index) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><filter id="mist"><feGaussianBlur stdDeviation="40"/></filter></defs><rect width="600" height="900" fill="${bg}"/><g font-family="Georgia, 'Hiragino Mincho ProN', serif">${art}${texts}${label("POLKA", 44, 846, 18, "currentColor", 'letter-spacing="5"')}${label(String(index).padStart(2, "0"), 514, 846, 18, "currentColor")}</g><rect x="24" y="24" width="552" height="852" fill="none" stroke="currentColor" opacity=".2"/></svg>`;
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
    const [bg, art, texts] = designs[i];
    const svg = frame(bg, art, texts, i + 1);
    await writeFile(path.join(out, `${books[i].slug}.svg`), svg);
    await page.setContent(
      `<style>html,body{margin:0;width:600px;height:900px;color:${i === 1 || i === 2 || i === 6 ? "#eee8d9" : "#263532"}}</style>${svg}`,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, `${books[i].slug}.png`) });
  }
} finally {
  await browser.close();
}
console.log(`Created ${books.length} local covers in demo/covers.`);
