CREATE TABLE `assistance_events` ( `id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `kind` text NOT NULL, `status` text NOT NULL, `model` text NOT NULL, `tokens` integer DEFAULT 0 NOT NULL, `created_at` integer DEFAULT (unixepoch()) NOT NULL, FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action );
--> statement-breakpoint
CREATE INDEX `assistance_time` ON `assistance_events` (`created_at`);
--> statement-breakpoint
CREATE TABLE `matching_preferences` ( `user_id` text PRIMARY KEY NOT NULL, `mode` text DEFAULT 'any' NOT NULL, `days` text DEFAULT '[]' NOT NULL, `timezone` text DEFAULT 'UTC' NOT NULL, `max_minutes` integer, FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action );
--> statement-breakpoint
CREATE TABLE `review_flags` ( `id` text PRIMARY KEY NOT NULL, `rule` text NOT NULL, `subject` text NOT NULL, `evidence` text NOT NULL, `status` text DEFAULT 'review_recommended' NOT NULL, `reason` text, `reviewer_id` text, `reviewed_at` integer, `created_at` integer DEFAULT (unixepoch()) NOT NULL, FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action );
--> statement-breakpoint
CREATE UNIQUE INDEX `flag_rule_subject` ON `review_flags` (`rule`,`subject`);
--> statement-breakpoint
CREATE TABLE `task_events` ( `id` text PRIMARY KEY NOT NULL, `task_id` text NOT NULL, `status` text NOT NULL, `actor_id` text, `note` text, `created_at` integer DEFAULT (unixepoch()) NOT NULL, FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action );
--> statement-breakpoint
CREATE INDEX `task_events_task` ON `task_events` (`task_id`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER support_task_created AFTER INSERT ON tasks BEGIN INSERT INTO task_events(id,task_id,status,actor_id) VALUES(lower(hex(randomblob(16))),NEW.id,NEW.status,NEW.requester_id); END;
--> statement-breakpoint
CREATE TRIGGER support_task_changed AFTER UPDATE OF status ON tasks WHEN OLD.status<>NEW.status BEGIN INSERT INTO task_events(id,task_id,status,actor_id,note) VALUES(lower(hex(randomblob(16))),NEW.id,NEW.status,CASE WHEN NEW.status='accepted' THEN NEW.helper_id WHEN NEW.status='awaiting_confirmation' THEN NEW.finished_by WHEN NEW.status='completed' THEN NEW.confirmed_by ELSE NULL END,NEW.problem); END;

--> statement-breakpoint
CREATE TRIGGER task_events_no_update BEFORE UPDATE ON task_events BEGIN SELECT RAISE(ABORT,'immutable_task_history'); END;
--> statement-breakpoint
CREATE TRIGGER task_events_no_delete BEFORE DELETE ON task_events BEGIN SELECT RAISE(ABORT,'immutable_task_history'); END;
