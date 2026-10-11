import { chromium } from "@playwright/test";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));
const output = path.join(root, "docs/screenshots");
await mkdir(output, { recursive: true });
const base = new URL(process.env.POLKA_DEMO_URL ?? "http://127.0.0.1:14200");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
  throw new Error("Capture is restricted to localhost.");
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const errors = [];
async function selectDemoShelf(page) {
  const loaded = page.waitForResponse(
    (response) =>
      response.url().includes("/recommendation-lists/") && response.ok(),
  );
  await page.getByRole("button", { name: /Мир на четырёх языках/ }).click();
  await loaded;
  await page.getByRole("heading", { name: "こころ", exact: true }).waitFor();
  const firstCover = page.locator(".book-card img").first();
  await firstCover.scrollIntoViewIfNeeded();
  await firstCover.evaluate((image) => image.decode());
}
async function primeCovers(page) {
  const more = page.getByRole("button", { name: "Показать ещё книги" });
  if (await more.isVisible()) await more.click();
  for (const image of await page.locator(".book-card img").all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element) => element.decode());
  }
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(new URL("/mattoy", base).href);
  await page.getByTestId("profile-hero").waitFor();
  await page.locator(".book-card img").first().waitFor();
  await page.screenshot({
    path: path.join(output, "profile-desktop.png"),
    fullPage: true,
  });
  await selectDemoShelf(page);
  await primeCovers(page);
  await page
    .locator(".books-grid")
    .screenshot({ path: path.join(output, "shelf-gallery.png") });
  await page
    .getByRole("heading", { name: "Мир на четырёх языках", exact: true })
    .waitFor();
  await page.locator(".book-card").first().scrollIntoViewIfNeeded();
  await page.locator(".book-card img").first().waitFor();
  await page.screenshot({ path: path.join(output, "shelf-desktop.png") });
  const bookLink = page
    .getByRole("heading", { name: "こころ", exact: true })
    .getByRole("link");
  const bookPath = await bookLink.getAttribute("href");
  await bookLink.click();
  await page.getByRole("button", { name: "Нажмите для погружения" }).click();
  await page.locator(".typewriter-cursor").waitFor({ state: "visible" });
  await page.locator(".typewriter-cursor").waitFor({ state: "hidden" });
  await page.screenshot({ path: path.join(output, "book-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL("/mattoy", base).href);
  await page.getByTestId("profile-hero").waitFor();
  await selectDemoShelf(page);
  await primeCovers(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".book-card img").first().waitFor();
  await page.screenshot({
    path: path.join(output, "profile-mobile.png"),
    fullPage: true,
  });
  await page.goto(new URL(bookPath, base).href);
  await page.getByRole("heading", { name: "こころ", exact: true }).waitFor();
  await page.screenshot({
    path: path.join(output, "book-mobile.png"),
    fullPage: true,
  });
  await context.close();

  const recording = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: output, size: { width: 1280, height: 800 } },
  });
  const demo = await recording.newPage();
  demo.on("pageerror", (error) => errors.push(error.message));
  demo.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await demo.goto(new URL("/mattoy", base).href);
  await demo.getByTestId("profile-hero").waitFor();
  await demo.waitForTimeout(600);
  await selectDemoShelf(demo);
  await demo.locator(".book-card").first().scrollIntoViewIfNeeded();
  await demo.locator(".book-cover").first().hover();
  await demo.waitForTimeout(900);
  await demo
    .getByRole("heading", { name: "こころ", exact: true })
    .getByRole("link")
    .click();
  await demo.getByRole("button", { name: "Нажмите для погружения" }).click();
  await demo.locator(".typewriter-cursor").waitFor({ state: "visible" });
  await demo.locator(".typewriter-cursor").waitFor({ state: "hidden" });
  await demo.getByRole("button", { name: "Мнения", exact: true }).click();
  await demo.getByRole("button", { name: "Нажмите для погружения" }).click();
  await demo.locator(".typewriter-cursor").waitFor({ state: "visible" });
  await demo.locator(".typewriter-cursor").waitFor({ state: "hidden" });
  await demo.waitForTimeout(600);
  const video = demo.video();
  await recording.close();
  await rename(
    await video.path(),
    path.join(output, "polka-interactions.webm"),
  );
  const gif = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      path.join(output, "polka-interactions.webm"),
      "-vf",
      "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
      "-loop",
      "0",
      path.join(output, "polka-interactions.gif"),
    ],
    { encoding: "utf8" },
  );
  if (gif.error?.code === "ENOENT")
    console.log("ffmpeg unavailable; recorded WebM retained.");
  else if (gif.status !== 0)
    throw new Error(`GIF encoding failed: ${gif.stderr.slice(-500)}`);
  await writeFile(
    path.join(output, "capture.json"),
    JSON.stringify(
      {
        date: new Date().toLocaleDateString("sv-SE", {
          timeZone: "Europe/Moscow",
        }),
        capturedAt: new Date().toISOString(),
        url: base.href,
        viewports: [
          [1440, 1000],
          [390, 844],
          [1280, 800],
        ],
        consoleErrors: errors,
      },
      null,
      2,
    ) + "\n",
  );
  if (errors.length)
    throw new Error(`Browser reported ${errors.length} errors.`);
  console.log(
    "Captured desktop/mobile screenshots and real interaction recording.",
  );
} finally {
  await browser.close();
}
