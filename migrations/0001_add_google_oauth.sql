PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `users_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`google_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `users_new` SELECT `id`, `email`, `password_hash`, NULL, `created_at` FROM `users`;
--> statement-breakpoint
DROP TABLE `users`;
--> statement-breakpoint
ALTER TABLE `users_new` RENAME TO `users`;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
