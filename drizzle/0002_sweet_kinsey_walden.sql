CREATE TABLE `agreement_acceptances` ( `id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `task_id` text, `kind` text NOT NULL, `version` text NOT NULL, `signature` text NOT NULL, `accepted_at` integer DEFAULT (unixepoch()) NOT NULL, FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action );
--> statement-breakpoint
CREATE UNIQUE INDEX `consent_account_once` ON `agreement_acceptances` (`user_id`,`kind`,`version`) WHERE "agreement_acceptances"."task_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `consent_task_once` ON `agreement_acceptances` (`user_id`,`task_id`,`kind`,`version`) WHERE "agreement_acceptances"."task_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD `language` text DEFAULT 'en' NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD `age_band` text DEFAULT '' NOT NULL;
--> statement-breakpoint
DROP TRIGGER ledger_validate;
--> statement-breakpoint
CREATE TRIGGER ledger_validate BEFORE INSERT ON ledger BEGIN SELECT RAISE(ABORT,'invalid_ledger') WHERE NEW.amount<=0 OR typeof(NEW.amount)<>'integer' OR NEW.status<>'posted' OR NEW.type NOT IN ('onboarding','transfer','adjustment','reserve','release'); SELECT RAISE(ABORT,'self_payment') WHERE NEW.source_id IS NOT NULL AND NEW.source_id=NEW.destination_id; SELECT RAISE(ABORT,'invalid_issuance') WHERE NEW.type IN ('onboarding','adjustment') AND ((NEW.source_id IS NULL)=(NEW.destination_id IS NULL)); SELECT RAISE(ABORT,'invalid_transfer') WHERE NEW.type='transfer' AND (NEW.source_id IS NULL OR NEW.destination_id IS NULL OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND status='completed' AND requester_id=NEW.source_id AND helper_id=NEW.destination_id AND actual_seconds=NEW.amount)); SELECT RAISE(ABORT,'invalid_reservation') WHERE NEW.type IN ('reserve','release') AND (NEW.destination_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND requester_id=NEW.source_id AND estimated_seconds=NEW.amount)); SELECT RAISE(ABORT,'invalid_reservation') WHERE NEW.type='reserve' AND NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND status='open'); SELECT RAISE(ABORT,'invalid_release') WHERE NEW.type='release' AND NOT EXISTS(SELECT 1 FROM ledger WHERE task_id=NEW.task_id AND type='reserve' AND amount=NEW.amount); END;
--> statement-breakpoint
CREATE TRIGGER consent_no_update BEFORE UPDATE ON agreement_acceptances BEGIN SELECT RAISE(ABORT,'immutable_consent'); END;
--> statement-breakpoint
CREATE TRIGGER consent_no_delete BEFORE DELETE ON agreement_acceptances BEGIN SELECT RAISE(ABORT,'immutable_consent'); END;
