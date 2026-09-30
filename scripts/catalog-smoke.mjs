import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, request } from "../.sites-runtime/qa/node_modules/playwright/index.mjs";

const baseURL = process.env.CATALOG_TEST_URL || "http://127.0.0.1:5173";
const api = await request.newContext({ baseURL });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
try {
  const catalog = await (await api.get("/api/products")).json();
  assert.ok(catalog.products.length > 0, "Catalog has products");
  assert.ok(catalog.products.every(product => Array.isArray(product.images) && product.images.length > 0), "Every product supplies a gallery");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(baseURL + "/", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Tất cả sản phẩm", exact: true }).waitFor();
  await page.locator(".catalog-card").first().waitFor();
  const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(layout.scroll <= layout.width + 1, "Mobile page has no horizontal overflow");
  assert.equal(await page.getByText("Túi", { exact: true }).count(), 0, "Cart is not exposed to customers");
  const first = catalog.products[0];
  await page.getByLabel("Tìm sản phẩm").fill(first.name);
  assert.equal(await page.locator(".catalog-card").count(), 1, "Search filters catalogue");
  await page.locator(".catalog-card").first().getByRole("button", { name: /Xem ảnh & thông tin/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("heading", { name: first.name, exact: true }).waitFor();
  await dialog.getByRole("link", { name: /Hỏi về mẫu này qua Zalo/ }).waitFor();
  assert.equal(await dialog.locator("img").first().getAttribute("alt"), `${first.name} – ảnh 1`);
  mkdirSync(new URL("../outputs/catalog-qa/", import.meta.url), { recursive: true });
  await page.screenshot({ path: new URL("mobile-catalog-detail.png", new URL("../outputs/catalog-qa/", import.meta.url)).pathname.replace(/^\/(\w:)/, "$1"), fullPage: true });
  await context.close();
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log("CATALOG SMOKE TEST PASSED");
} finally { await browser.close(); await api.dispose(); }
