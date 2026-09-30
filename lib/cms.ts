import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { headers, cookies } from "next/headers";
import { getDb } from "../db";
import { categories, products, settings } from "../db/schema";
import { verifyAdminSession } from "./admin-auth";

export type ShopProduct = typeof products.$inferSelect;
export type ShopCategory = typeof categories.$inferSelect;

const seedCategories = [
  ["fresh", "Hoa tươi", "hoa-tuoi", 1],
  ["gift", "Quà tặng", "qua-tang", 2],
  ["wedding", "Hoa cưới", "hoa-cuoi", 3],
  ["plant", "Cây xanh", "cay-xanh", 4],
] as const;

const seedProducts = [
  ["doa-hong-mo", "Đóa Hồng Mơ", "fresh", "Sinh nhật", 590000, "Hồng phấn, mao lương và baby trong bình thủy tinh.", "/assets/blush-bouquet.png", "Mới", 18, 1],
  ["ngay-ruc-ro", "Ngày Rực Rỡ", "gift", "Chúc mừng", 890000, "Giỏ hoa tươi, nến thơm và trà được gói sẵn.", "/assets/gift-hamper.png", "Bán chạy", 12, 1],
  ["khuc-nhac-chieu", "Khúc Nhạc Chiều", "fresh", "Kỷ niệm", 750000, "Hồng, lisianthus cùng món quà nhỏ tinh tế.", "/assets/hero-bouquet.png", "Theo mùa", 15, 1],
  ["sac-xuan", "Sắc Xuân", "fresh", "Chúc mừng", 680000, "Một bó hoa rực rỡ để nói lời chúc mới mẻ.", "/assets/blush-bouquet.png", "", 20, 0],
  ["loi-thuong", "Lời Thương", "gift", "Kỷ niệm", 990000, "Nến thơm, trà và hoa tươi trong hộp quà đặc biệt.", "/assets/gift-hamper.png", "Giới hạn", 8, 1],
  ["nhat-ky-xanh", "Nhật Ký Xanh", "plant", "Tân gia", 520000, "Cây để bàn kết hợp cùng thiệp và hộp quà nhỏ.", "/assets/hero-bouquet.png", "", 17, 0],
  ["ngay-cuoi", "Ngày Cưới", "wedding", "Đám cưới", 1450000, "Bó hoa cưới đặt riêng theo màu váy và không gian tiệc.", "/assets/blush-bouquet.png", "Đặt trước", 6, 1],
  ["ben-nhau", "Bên Nhau", "fresh", "Kỷ niệm", 830000, "Hoa hồng, foliage và ribbon màu rượu vang.", "/assets/hero-bouquet.png", "", 14, 0],
  ["bong-nang", "Bông Nắng", "gift", "Sinh nhật", 720000, "Quà sinh nhật tinh gọn với hoa và những món nhỏ xinh.", "/assets/gift-hamper.png", "", 11, 0],
] as const;

const seedSettings = {
  announcement: "Giao hoa nội thành trong ngày · Thiệp viết tay miễn phí",
  heroTitle: "Một bó hoa, một lời muốn nói.",
  heroSubtitle: "Hoa tươi được chọn kỹ mỗi sáng, kết hợp cùng những món quà nhỏ để mọi dịp đáng nhớ đều có dấu ấn riêng.",
  contactPhone: "0900 000 000",
  contactZalo: "https://zalo.me/",
  contactInstagram: "https://instagram.com/",
};

export async function ensureSeedData() {
  const db = getDb();
  const initialized = await db.select().from(settings).where(eq(settings.key, "_seed_version")).limit(1);
  if (initialized.length) return;
  const now = new Date().toISOString();
  // One atomic initialization: deleted sample records must never be recreated.
  await db.batch([
    db.insert(settings).values({ key: "_seed_version", value: "1", updatedAt: now }).onConflictDoNothing(),
    ...seedCategories.map(([id, name, slug, sortOrder]) =>
      db
        .insert(categories)
        .values({ id, name, slug, sortOrder, active: true })
        .onConflictDoNothing(),
    ),
    ...seedProducts.map(([id, name, categoryId, occasion, price, description, image, badge, stock, featured]) =>
      db
        .insert(products)
        .values({
          id,
          name,
          categoryId,
          occasion,
          price,
          description,
          image,
          badge,
          stock,
          active: true,
          featured: Boolean(featured),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing(),
    ),
    ...Object.entries(seedSettings).map(([key, value]) =>
      db
        .insert(settings)
        .values({ key, value, updatedAt: now })
        .onConflictDoNothing(),
    ),
  ]);
}

export async function getShopSettings() {
  await ensureSeedData();
  const rows = await getDb().select().from(settings);
  return Object.fromEntries(rows.filter((row) => !row.key.startsWith("_")).map((row) => [row.key, row.value]));
}

export async function isAdmin() {
  const adminPassword = import.meta.env.DEV ? env.ADMIN_LOCAL_TOKEN : env.ADMIN_PASSWORD;
  const token = (await cookies()).get("linh_local_admin")?.value;
  if (adminPassword) {
    if (token && token === adminPassword) return true;
    if (await verifyAdminSession(token, adminPassword)) return true;
  }
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const userEmail = requestHeaders.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const configuredAdmin = env.ADMIN_USER_ID;
  const configuredAdminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  const localAdmin = import.meta.env.DEV ? "local_seedy" : "";
  // The identity header is scoped to this Site, while the platform-level owner ID
  // is not. Keep the ID path for explicit staff accounts and match the verified
  // sign-in email for the owner account until staff are added.
  return Boolean(
    userId &&
      (userId === configuredAdmin ||
        userId === localAdmin ||
        (Boolean(userEmail) && userEmail === configuredAdminEmail)),
  );
}

export async function requireAdminResponse(request?: Request) {
  if (request && !["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
      return Response.json({ error: "Yêu cầu không hợp lệ. Hãy tải lại trang quản trị." }, { status: 403 });
    }
  }
  if (await isAdmin()) return null;
  return Response.json({ error: "Bạn không có quyền quản trị CMS." }, { status: 403 });
}

export function cleanText(value: unknown, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export async function categoryExists(categoryId: string) {
  const result = await getDb()
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  return result.length > 0;
}
