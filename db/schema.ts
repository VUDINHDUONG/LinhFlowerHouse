import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: text("category_id").notNull(),
  occasion: text("occasion").notNull().default("Dịp đặc biệt"),
  price: integer("price").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  imagesJson: text("images_json").notNull().default("[]"),
  badge: text("badge").notNull().default(""),
  stock: integer("stock").notNull().default(20),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  recipientName: text("recipient_name").notNull(),
  address: text("address").notNull(),
  deliveryDate: text("delivery_date").notNull(),
  deliverySlot: text("delivery_slot").notNull(),
  cardMessage: text("card_message").notNull().default(""),
  note: text("note").notNull().default(""),
  itemsJson: text("items_json").notNull(),
  total: integer("total").notNull(),
  status: text("status").notNull().default("Mới"),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
