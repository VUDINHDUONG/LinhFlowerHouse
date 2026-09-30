// Requires: npm install --prefix .sites-runtime/qa --no-save --package-lock=false playwright
// Uses only records with this run's unique QA prefix; leaves existing shop data intact.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium, request } from "../.sites-runtime/qa/node_modules/playwright/index.mjs";

const baseURL = process.env.ADMIN_TEST_URL || "http://127.0.0.1:5173";
const token = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8").match(/^ADMIN_LOCAL_TOKEN=([A-Za-z0-9_-]+)/m)?.[1];
assert.ok(token, "Local access token configured");
const tag = `QA-${Date.now()}`;
const outputs = new URL("../outputs/admin-qa/", import.meta.url);
mkdirSync(outputs, { recursive: true });
const api = await request.newContext({ baseURL });
const guest = await request.newContext({ baseURL });
const errors = [];
let browser;
let categoryId;
const createdProducts = new Set();
const createdOrders = new Set();
async function call(path, method = "GET", data, expected = 200) {
  const response = await api.fetch(path, { method, ...(data === undefined ? {} : { data }) });
  assert.equal(response.status(), expected, `${method} ${path}: ${await response.text()}`);
  return response.json();
}
async function checkWidth(page, name) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(sizes.scroll <= sizes.width + 1, `${name} overflows: ${JSON.stringify(sizes)}`);
}
try {
  assert.equal((await guest.get("/api/admin/bootstrap")).status(), 403);
  for (const route of ["products", "categories", "orders", "settings", "uploads"]) {
    assert.equal((await guest.post(`/api/admin/${route}`, { data: {} })).status(), route === "settings" ? 405 : 403);
  }
  assert.equal((await guest.post("/api/admin/local-login", { data: { token: "incorrect" } })).status(), 401);
  await call("/api/admin/local-login", "POST", { token });
  const before = await call("/api/admin/bootstrap");
  assert.ok(before.products.length > 0);
  assert.equal((await api.post("/api/admin/products", { headers: { Origin: "https://example.invalid" }, data: {} })).status(), 403);
  assert.equal((await api.post("/api/admin/products", { data: null })).status(), 400);
  assert.equal((await api.post("/api/admin/uploads", { multipart: { file: { name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not an image") } } })).status(), 415);
  assert.equal((await api.post("/api/admin/uploads", { multipart: { file: { name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(8 * 1024 * 1024 + 1) } } })).status(), 413);
  const phoneHeic = Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99, 0, 0, 0, 0, 104, 101, 105, 99, 109, 105, 102, 49]);
  assert.equal((await api.post("/api/admin/uploads", { multipart: { file: { name: "phone.heic", mimeType: "image/heic", buffer: phoneHeic } } })).status(), 201);
  console.log("PASS: authentication, cross-origin protection, upload rejection, and iPhone HEIC acceptance");

  const category = { name: tag + " Flowers", slug: tag.toLowerCase(), sortOrder: 20, active: true };
  categoryId = (await call("/api/admin/categories", "POST", category, 201)).id;
  await call("/api/admin/categories", "POST", category, 409);
  await call("/api/admin/categories", "PATCH", { ...category, id: categoryId, sortOrder: 21 });

  browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.message));
  page.on("dialog", d => d.accept());
  await page.goto(baseURL + "/admin");
  await page.getByLabel("Mã truy cập").fill(token);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("heading", { name: "Tổng quan", exact: true }).waitFor();
  await page.getByText("Doanh thu hoàn tất", { exact: true }).waitFor();
  await checkWidth(page, "mobile overview");
  await page.screenshot({ path: new URL("mobile-overview.png", outputs).pathname.replace(/^\/(\w:)/, "$1"), fullPage: true });
  const nav = page.getByRole("navigation", { name: "Quản trị", exact: true });
  await nav.getByRole("button", { name: "Sản phẩm", exact: true }).click();
  await page.getByRole("button", { name: "＋ Thêm sản phẩm", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên sản phẩm", { exact: true }).fill(tag + " Bouquet");
  await dialog.getByLabel("Danh mục", { exact: true }).selectOption(categoryId);
  await dialog.getByLabel("Giá bán (đ)", { exact: true }).fill("250000");
  await dialog.getByLabel("Tồn kho", { exact: true }).fill("12");
  await dialog.getByLabel("Mô tả", { exact: true }).fill("Hoa kiểm thử, tự động xóa sau khi kiểm tra.");
  const sampleImage = new URL("../public/assets/blush-bouquet.png", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
  await dialog.getByLabel("Thêm nhiều ảnh", { exact: true }).setInputFiles([sampleImage, sampleImage]);
  await dialog.getByText("Đã thêm 2 ảnh. Bấm Lưu sản phẩm để hoàn tất.", { exact: true }).waitFor({ timeout: 30000 });
  assert.equal(await dialog.getByLabel("Chụp ảnh sản phẩm", { exact: true }).getAttribute("capture"), "environment");
  await checkWidth(page, "mobile image form");
  await dialog.screenshot({ path: new URL("mobile-upload.png", outputs).pathname.replace(/^\/(\w:)/, "$1") });
  await dialog.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByLabel("Tìm sản phẩm", { exact: true }).fill(tag);
  let card = page.locator(".admin-product").filter({ hasText: tag });
  await card.waitFor();
  let state = await call("/api/admin/bootstrap");
  let product = state.products.find(p => p.name === tag + " Bouquet");
  assert.ok(product); createdProducts.add(product.id);
  assert.equal(product.images.length, 2);
  assert.match(product.image, /^\/api\/media\//);
  const image = await guest.get(product.images[1]);
  assert.equal(image.status(), 200); assert.match(image.headers()["content-type"], /^image\/(webp|png)$/);
  assert.equal(image.headers()["x-content-type-options"], "nosniff");
  await call("/api/admin/products", "PATCH", { ...product, images: product.images?.length ? product.images : [product.image], price: -1 }, 400);
  await call("/api/admin/categories?id=" + categoryId, "DELETE", undefined, 409);
  await card.getByRole("button", { name: "Sửa", exact: true }).click();
  await dialog.getByLabel("Tên sản phẩm", { exact: true }).fill(tag + " Edited");
  await dialog.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await card.getByRole("heading", { name: tag + " Edited", exact: true }).waitFor();
  await card.getByRole("button", { name: "Ẩn", exact: true }).click();
  await card.getByRole("button", { name: "Hiện", exact: true }).waitFor();
  let catalog = await (await guest.get("/api/products")).json();
  assert.ok(!catalog.products.some(p => p.id === product.id));
  await card.getByRole("button", { name: "Hiện", exact: true }).click();
  await card.getByRole("button", { name: "Ẩn", exact: true }).waitFor();
  await checkWidth(page, "mobile products");
  await page.screenshot({ path: new URL("mobile-products.png", outputs).pathname.replace(/^\/(\w:)/, "$1"), fullPage: true });
  console.log("PASS: mobile login, create/edit/hide product, camera input, optimized upload, public image retrieval");

  await nav.getByRole("button", { name: /Đơn hàng/ }).click();
  await page.getByRole("button", { name: "＋ Tạo đơn hàng", exact: true }).click();
  await dialog.getByLabel("Tên khách hàng", { exact: true }).fill(tag + " Customer");
  await dialog.getByLabel("Số điện thoại", { exact: true }).fill("0901234567");
  await dialog.getByLabel("Người nhận", { exact: true }).fill(tag + " Recipient");
  await dialog.getByLabel("Địa chỉ giao", { exact: true }).fill("Địa chỉ kiểm thử");
  await dialog.getByLabel("Thêm sản phẩm vào đơn", { exact: true }).selectOption(product.id);
  await dialog.getByRole("button", { name: "Lưu đơn hàng", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByLabel("Tìm đơn hàng", { exact: true }).fill(tag);
  const orderCard = page.locator(".admin-order").filter({ hasText: tag });
  await orderCard.waitFor();
  state = await call("/api/admin/bootstrap");
  const order = state.orders.find(o => o.customerName === tag + " Customer");
  assert.ok(order); createdOrders.add(order.id); assert.equal(order.total, 250000);
  await orderCard.getByRole("button", { name: "Sửa đơn", exact: true }).click();
  await dialog.getByLabel("Địa chỉ giao", { exact: true }).fill("Địa chỉ đã chỉnh sửa");
  await dialog.getByLabel("Số lượng " + tag + " Edited", { exact: true }).fill("2");
  await dialog.getByRole("button", { name: "Lưu đơn hàng", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await orderCard.getByText("Địa chỉ đã chỉnh sửa", { exact: true }).waitFor();
  await orderCard.getByLabel("Trạng thái " + order.id, { exact: true }).selectOption("Hoàn tất");
  await orderCard.locator(".admin-badge").filter({ hasText: "Hoàn tất" }).waitFor();
  state = await call("/api/admin/bootstrap");
  assert.equal(state.orders.find(o => o.id === order.id).total, 500000);
  await checkWidth(page, "mobile orders");
  await page.screenshot({ path: new URL("mobile-orders.png", outputs).pathname.replace(/^\/(\w:)/, "$1"), fullPage: true });
  await orderCard.getByRole("button", { name: "Xóa đơn", exact: true }).click();
  await orderCard.waitFor({ state: "hidden" });
  createdOrders.delete(order.id);
  console.log("PASS: mobile order create/edit/status/delete and server-calculated total");

  await nav.getByRole("button", { name: "Danh mục", exact: true }).click();
  await page.getByLabel("Tìm danh mục", { exact: true }).fill(tag);
  const categoryCard = page.locator(".admin-categories article").filter({ hasText: tag });
  await categoryCard.getByRole("button", { name: "Sửa danh mục", exact: true }).click();
  await dialog.getByLabel("Tên danh mục", { exact: true }).fill(tag + " Updated");
  await dialog.getByRole("button", { name: "Lưu danh mục", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await categoryCard.getByRole("heading", { name: tag + " Updated", exact: true }).waitFor();
  assert.equal(await categoryCard.getByRole("button", { name: "Xóa", exact: true }).isDisabled(), true);

  await nav.getByRole("button", { name: "Sản phẩm", exact: true }).click();
  await page.getByLabel("Tìm sản phẩm", { exact: true }).fill(tag);
  card = page.locator(".admin-product").filter({ hasText: tag });
  await card.getByRole("button", { name: "Xóa", exact: true }).click();
  await card.waitFor({ state: "hidden" });
  await page.reload();
  state = await call("/api/admin/bootstrap");
  assert.ok(!state.products.some(p => p.id === product.id)); createdProducts.delete(product.id);
  await call("/api/admin/categories?id=" + categoryId, "DELETE"); categoryId = undefined;
  console.log("PASS: category edit/conflict/in-use protection and persistent product deletion");
  await context.close();
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await desktop.addCookies((await api.storageState()).cookies);
  const desktopPage = await desktop.newPage();
  desktopPage.on("pageerror", e => errors.push(e.message));
  await desktopPage.goto(baseURL + "/admin");
  await desktopPage.getByText("Doanh thu hoàn tất", { exact: true }).waitFor();
  await desktopPage.getByRole("navigation", { name: "Quản trị", exact: true }).getByRole("button", { name: "Sản phẩm", exact: true }).click();
  await desktopPage.locator(".admin-product").first().waitFor();
  await checkWidth(desktopPage, "desktop products");
  await desktopPage.screenshot({ path: new URL("desktop-products.png", outputs).pathname.replace(/^\/(\w:)/, "$1"), fullPage: true });
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log("PASS: desktop layout and no browser runtime errors");
  console.log("ADMIN SMOKE TEST PASSED");
} catch (error) {
  console.error("Browser errors:", errors);
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) await page.screenshot({ path: new URL("failure.png", outputs).pathname.replace(/^\/(\w:)/, "$1"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  // Discover records created just before any UI assertion failed.
  try {
    const data = await (await api.get("/api/admin/bootstrap")).json();
    for (const p of data.products ?? []) if (p.name.startsWith(tag)) createdProducts.add(p.id);
    for (const o of data.orders ?? []) if (o.customerName.startsWith(tag)) createdOrders.add(o.id);
    for (const id of createdOrders) await api.delete("/api/admin/orders?id=" + encodeURIComponent(id));
    for (const id of createdProducts) await api.delete("/api/admin/products?id=" + encodeURIComponent(id));
    if (categoryId) await api.delete("/api/admin/categories?id=" + categoryId);
  } finally { await browser?.close(); await api.dispose(); await guest.dispose(); }
}
