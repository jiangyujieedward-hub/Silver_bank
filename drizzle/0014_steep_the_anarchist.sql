ALTER TABLE `care_preferences` ADD `ai_consented_at` integer;--> statement-breakpoint
ALTER TABLE `care_preferences` ADD `ai_auto_save` integer DEFAULT 1 NOT NULL;