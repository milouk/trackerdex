/**
 * Generates the README screenshots — dark theme, light theme, sprite-overview
 * detail page — by puppet-driving the live demo via headless Chrome.
 *
 * Usage:
 *   node --import tsx/esm scripts/screenshots.mts
 *   # or via npm script:
 *   npm run screenshots
 *
 * Targets the deployed URL by default; pass --url to override.
 */
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import puppeteer, { type Page } from "puppeteer-core";

const DEFAULT_URL = "https://milouk.me/trackerdex/";
const OUT_DIR = resolve(process.cwd(), "docs", "screenshots");
const VIEWPORT = { width: 1440, height: 900 };
const CHROME_BIN =
  process.env.PUPPETEER_EXECUTABLE_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const url = (() => {
  const idx = process.argv.indexOf("--url");
  return idx > -1 ? process.argv[idx + 1] : DEFAULT_URL;
})();

async function waitForSelector(page: Page, selector: string, timeout = 15_000): Promise<void> {
  await page.waitForSelector(selector, { timeout });
}

async function clickByText(page: Page, selector: string, text: string): Promise<void> {
  await page.evaluate(
    (sel, t) => {
      const els = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
      const match = els.find((el) => el.textContent?.trim().includes(t));
      if (!match) throw new Error(`No "${t}" element matching ${sel}`);
      match.click();
    },
    selector,
    text,
  );
}

async function setTheme(page: Page, theme: "dark" | "light"): Promise<void> {
  const current = await page.evaluate(
    () => document.documentElement.getAttribute("data-theme") ?? "dark",
  );
  if (current === theme) return;
  await clickByText(page, ".ob-iconbtn", current === "dark" ? "☀" : "☾");
  await page.waitForFunction(
    (t) => (document.documentElement.getAttribute("data-theme") ?? "dark") === t,
    { timeout: 2_000 },
    theme,
  );
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    defaultViewport: VIEWPORT,
    args: ["--hide-scrollbars"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });

    // 1) Connect screen → click RUN OFFLINE.
    await waitForSelector(page, ".ob-connect-card");
    await clickByText(page, ".ob-btn-ghost", "RUN OFFLINE");
    await waitForSelector(page, ".ob-grid .ob-card.is-caught");
    // Let the marquee fill + sprites render.
    await new Promise((r) => setTimeout(r, 1_500));

    // 2) Dark theme shot.
    await setTheme(page, "dark");
    await page.screenshot({ path: resolve(OUT_DIR, "dark.png"), type: "png" });
    console.log("✓ dark.png");

    // 3) Light theme shot.
    await setTheme(page, "light");
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: resolve(OUT_DIR, "light.png"), type: "png" });
    console.log("✓ light.png");

    // 4) Sprite overview — first caught card → detail.
    await setTheme(page, "dark");
    await new Promise((r) => setTimeout(r, 400));
    await page.evaluate(() => {
      const card = document.querySelector(".ob-card.is-caught") as HTMLElement | null;
      card?.click();
    });
    await waitForSelector(page, ".ob-detail-page");
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: resolve(OUT_DIR, "sprite-overview.png"),
      type: "png",
    });
    console.log("✓ sprite-overview.png");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
