CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`recipient_name` text NOT NULL,
	`address` text NOT NULL,
	`delivery_date` text NOT NULL,
	`delivery_slot` text NOT NULL,
	`card_message` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`items_json` text NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'Mới' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category_id` text NOT NULL,
	`occasion` text DEFAULT 'Dịp đặc biệt' NOT NULL,
	`price` integer NOT NULL,
	`description` text NOT NULL,
	`image` text NOT NULL,
	`badge` text DEFAULT '' NOT NULL,
	`stock` integer DEFAULT 20 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
