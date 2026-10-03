CREATE TABLE `partner_badges` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`issued_by` text NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`reason` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `partner_programs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issued_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partner_badge_once` ON `partner_badges` (`program_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `partner_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'participant' NOT NULL,
	`status` text DEFAULT 'enrolled' NOT NULL,
	`progress` text DEFAULT '' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`reviewer_id` text,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `partner_programs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partner_enrollment_once` ON `partner_enrollments` (`program_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `partner_enrollment_user` ON `partner_enrollments` (`user_id`);--> statement-breakpoint
CREATE TABLE `partner_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`sharer_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`status` text DEFAULT 'matched' NOT NULL,
	`sharer_confirmed` integer DEFAULT 0 NOT NULL,
	`learner_confirmed` integer DEFAULT 0 NOT NULL,
	`task_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `partner_programs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sharer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partner_match_once` ON `partner_matches` (`program_id`,`sharer_id`,`learner_id`);--> statement-breakpoint
CREATE TABLE `partner_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`category_id` text,
	`location` text NOT NULL,
	`requested_at` integer,
	`duration` integer DEFAULT 3600 NOT NULL,
	`capacity` integer DEFAULT 20 NOT NULL,
	`requirements` text DEFAULT '' NOT NULL,
	`materials` text DEFAULT '' NOT NULL,
	`modules` text DEFAULT '' NOT NULL,
	`completion` text DEFAULT '' NOT NULL,
	`badge` text DEFAULT '' NOT NULL,
	`valid_days` integer,
	`required_training_id` text,
	`related_program_id` text,
	`skills` text DEFAULT '' NOT NULL,
	`budget` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `partner_program_org` ON `partner_programs` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `partner_support` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`reviewer_id` text,
	`ledger_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `partner_programs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partner_support_ledger_id_unique` ON `partner_support` (`ledger_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `partner_support_once` ON `partner_support` (`program_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `partner_task_links` (
	`task_id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`required_training_id` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_id`) REFERENCES `partner_programs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`required_training_id`) REFERENCES `partner_programs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `partner_task_program` ON `partner_task_links` (`program_id`);
--> statement-breakpoint
DROP VIEW balances;
--> statement-breakpoint
CREATE VIEW balances AS SELECT u.id AS user_id,
 COALESCE((SELECT SUM( IIF(l.destination_id=u.id,l.amount,-l.amount) ) FROM ledger l WHERE l.type IN ('onboarding','transfer','adjustment','sponsorship') AND (l.source_id=u.id OR l.destination_id=u.id)),0) AS total,
 COALESCE((SELECT SUM( IIF(l.type='reserve',l.amount,-l.amount) ) FROM ledger l WHERE l.type IN ('reserve','release') AND l.source_id=u.id),0) AS reserved,
 COALESCE((SELECT SUM( IIF(l.destination_id=u.id,l.amount,-l.amount) ) FROM ledger l WHERE l.type IN ('onboarding','transfer','adjustment','sponsorship') AND (l.source_id=u.id OR l.destination_id=u.id)),0)-COALESCE((SELECT SUM( IIF(l.type='reserve',l.amount,-l.amount) ) FROM ledger l WHERE l.type IN ('reserve','release') AND l.source_id=u.id),0) AS available
 FROM users u;

--> statement-breakpoint
DROP TRIGGER ledger_validate;
--> statement-breakpoint
CREATE TRIGGER ledger_validate BEFORE INSERT ON ledger BEGIN
 SELECT RAISE(ABORT,'invalid_ledger') WHERE NEW.amount<=0 OR typeof(NEW.amount)<>'integer' OR NEW.status<>'posted' OR NEW.type NOT IN ('onboarding','transfer','adjustment','reserve','release','sponsorship');
 SELECT RAISE(ABORT,'self_payment') WHERE NEW.source_id IS NOT NULL AND NEW.source_id=NEW.destination_id;
 SELECT RAISE(ABORT,'invalid_issuance') WHERE NEW.type IN ('onboarding','adjustment') AND ((NEW.source_id IS NULL)=(NEW.destination_id IS NULL));
 SELECT RAISE(ABORT,'invalid_transfer') WHERE NEW.type='transfer' AND (NEW.source_id IS NULL OR NEW.destination_id IS NULL OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND status='completed' AND requester_id=NEW.source_id AND helper_id=NEW.destination_id AND actual_seconds=NEW.amount));
 SELECT RAISE(ABORT,'invalid_reservation') WHERE NEW.type IN ('reserve','release') AND (NEW.destination_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND requester_id=NEW.source_id AND estimated_seconds=NEW.amount));
 SELECT RAISE(ABORT,'invalid_reservation') WHERE NEW.type='reserve' AND NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND status='open');
 SELECT RAISE(ABORT,'invalid_release') WHERE NEW.type='release' AND NOT EXISTS(SELECT 1 FROM ledger WHERE task_id=NEW.task_id AND type='reserve' AND amount=NEW.amount);
 SELECT RAISE(ABORT,'invalid_sponsorship') WHERE NEW.type='sponsorship' AND NOT EXISTS(
 SELECT 1 FROM partner_support s JOIN partner_programs p ON p.id=s.program_id JOIN organization_members m ON m.organization_id=p.organization_id
 WHERE s.ledger_id=NEW.id AND s.status='approved' AND s.user_id=NEW.destination_id AND s.amount=NEW.amount AND m.user_id=NEW.source_id AND m.role='owner' AND m.active=1);
END;
--> statement-breakpoint

DROP TRIGGER ledger_balance_guard;
--> statement-breakpoint
CREATE TRIGGER ledger_balance_guard BEFORE INSERT ON ledger WHEN NEW.source_id IS NOT NULL AND NEW.type IN ('reserve','transfer','adjustment','sponsorship') BEGIN
 SELECT RAISE(ABORT,'insufficient_credit') WHERE NEW.amount>COALESCE((SELECT available FROM balances WHERE user_id=NEW.source_id),0);
END;
--> statement-breakpoint
CREATE TRIGGER partner_capacity BEFORE INSERT ON partner_enrollments BEGIN
 SELECT RAISE(ABORT,'program_full') WHERE (SELECT COUNT(*) FROM partner_enrollments WHERE program_id=NEW.program_id AND status NOT IN ('withdrawn','declined')) >= (SELECT capacity FROM partner_programs WHERE id=NEW.program_id);
END;
--> statement-breakpoint
CREATE TRIGGER partner_support_budget BEFORE UPDATE OF status ON partner_support WHEN NEW.status='approved' BEGIN
 SELECT RAISE(ABORT,'support_already_reviewed') WHERE OLD.status<>'pending';
 SELECT RAISE(ABORT,'support_budget_exceeded') WHERE NEW.amount+COALESCE((SELECT SUM(amount) FROM partner_support WHERE program_id=NEW.program_id AND status='approved'),0)>(SELECT budget FROM partner_programs WHERE id=NEW.program_id);
END;
--> statement-breakpoint
CREATE TRIGGER partner_badge_guard BEFORE INSERT ON partner_badges BEGIN
 SELECT RAISE(ABORT,'training_not_completed') WHERE NOT EXISTS(SELECT 1 FROM partner_enrollments e JOIN partner_programs p ON p.id=e.program_id WHERE e.user_id=NEW.user_id AND e.program_id=NEW.program_id AND e.status='completed' AND p.kind='training');
END;
--> statement-breakpoint
CREATE TRIGGER partner_task_training BEFORE UPDATE OF helper_id ON tasks WHEN NEW.helper_id IS NOT NULL AND OLD.helper_id IS NULL BEGIN
 SELECT RAISE(ABORT,'training_required') WHERE EXISTS(SELECT 1 FROM partner_task_links l WHERE l.task_id=NEW.id AND l.required_training_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM partner_badges b WHERE b.program_id=l.required_training_id AND b.user_id=NEW.helper_id AND b.revoked_at IS NULL AND (b.expires_at IS NULL OR b.expires_at>unixepoch())));
 SELECT RAISE(ABORT,'partner_unavailable') WHERE EXISTS(SELECT 1 FROM partner_task_links l JOIN partner_programs p ON p.id=l.program_id JOIN organizations o ON o.id=p.organization_id WHERE l.task_id=NEW.id AND (p.status<>'published' OR o.status<>'verified' OR o.review_due<=unixepoch()));
END;
--> statement-breakpoint
CREATE TRIGGER partner_match_helper BEFORE UPDATE OF helper_id ON tasks WHEN NEW.helper_id IS NOT NULL AND OLD.helper_id IS NULL BEGIN
 SELECT RAISE(ABORT,'matched_sharer_required') WHERE EXISTS(SELECT 1 FROM partner_matches WHERE task_id=NEW.id AND sharer_id<>NEW.helper_id);
END;
--> statement-breakpoint
CREATE TRIGGER partner_task_capacity BEFORE INSERT ON partner_task_links WHEN (SELECT kind FROM partner_programs WHERE id=NEW.program_id)='task' BEGIN
 SELECT RAISE(ABORT,'task_places_already_created') WHERE (SELECT COUNT(*) FROM partner_task_links WHERE program_id=NEW.program_id)>=(SELECT capacity FROM partner_programs WHERE id=NEW.program_id);
END;
