CREATE TABLE `care_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`target_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `care_audit_owner` ON `care_audit` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `care_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`token_hash` text,
	`permissions` text DEFAULT '[]' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`last_sync` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `care_device_owner` ON `care_devices` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `care_device_token` ON `care_devices` (`token_hash`);--> statement-breakpoint
CREATE TABLE `care_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_id` text NOT NULL,
	`external_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` integer NOT NULL,
	`unit` text NOT NULL,
	`measured_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`) REFERENCES `care_devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `care_measure_owner` ON `care_measurements` (`user_id`,`measured_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `care_measure_once` ON `care_measurements` (`device_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `care_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`consented_at` integer NOT NULL,
	`bank_consent` integer DEFAULT 0 NOT NULL,
	`activity` text DEFAULT '[]' NOT NULL,
	`notifications` integer DEFAULT 1 NOT NULL,
	`reminder_hour` integer,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `care_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `care_records_owner` ON `care_records` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `care_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`summary_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`expires` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`summary_id`) REFERENCES `care_summaries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `care_share_recipient` ON `care_shares` (`recipient_id`,`expires`);--> statement-breakpoint
CREATE TABLE `care_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`appointment_at` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `care_summary_owner` ON `care_summaries` (`user_id`);