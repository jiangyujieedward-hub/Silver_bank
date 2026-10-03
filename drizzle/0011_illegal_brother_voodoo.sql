CREATE TABLE `partner_support_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`support_id` text NOT NULL,
	`ledger_id` text NOT NULL,
	`amount` integer NOT NULL,
	FOREIGN KEY (`support_id`) REFERENCES `partner_support`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ledger_id`) REFERENCES `ledger`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partner_usage_once` ON `partner_support_usage` (`support_id`,`ledger_id`);--> statement-breakpoint
CREATE TRIGGER partner_support_spent AFTER INSERT ON ledger WHEN NEW.type='transfer' BEGIN
 INSERT INTO partner_support_usage(id,support_id,ledger_id,amount)
 SELECT NEW.id||':'||id,id,NEW.id,MIN(remaining,MAX(0,NEW.amount-prior))
 FROM (
  SELECT id,remaining,COALESCE(SUM(remaining) OVER(ORDER BY created_at,id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS prior
  FROM (
   SELECT s.id,s.created_at,s.amount-COALESCE((SELECT SUM(amount) FROM partner_support_usage WHERE support_id=s.id),0) AS remaining
   FROM partner_support s WHERE s.user_id=NEW.source_id AND s.status='approved'
  ) WHERE remaining>0
 ) WHERE NEW.amount>prior;
END;
--> statement-breakpoint
CREATE TRIGGER partner_usage_no_update BEFORE UPDATE ON partner_support_usage BEGIN SELECT RAISE(ABORT,'immutable_support_usage'); END;
--> statement-breakpoint
CREATE TRIGGER partner_usage_no_delete BEFORE DELETE ON partner_support_usage BEGIN SELECT RAISE(ABORT,'immutable_support_usage'); END;
