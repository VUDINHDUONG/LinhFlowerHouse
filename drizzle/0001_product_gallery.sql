ALTER TABLE `products` ADD `images_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
UPDATE `products` SET `images_json` = json_array(`image`) WHERE `images_json` = '[]';
