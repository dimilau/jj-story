CREATE TABLE `picture_books` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`title` text NOT NULL,
	`r2_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
