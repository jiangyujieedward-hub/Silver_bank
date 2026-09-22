CREATE VIEW balances AS SELECT u.id AS user_id,
 COALESCE((SELECT SUM( IIF(l.destination_id=u.id,l.amount,-l.amount) ) FROM ledger l WHERE l.type IN ('onboarding','transfer','adjustment') AND (l.source_id=u.id OR l.destination_id=u.id)),0) AS total,
 COALESCE((SELECT SUM( IIF(l.type='reserve',l.amount,-l.amount) ) FROM ledger l WHERE l.type IN ('reserve','release') AND l.source_id=u.id),0) AS reserved,
 COALESCE((SELECT SUM( IIF(l.destination_id=u.id,l.amount,-l.amount) ) FROM ledger l WHERE l.type IN ('onboarding','transfer','adjustment') AND (l.source_id=u.id OR l.destination_id=u.id)),0)-COALESCE((SELECT SUM( IIF(l.type='reserve',l.amount,-l.amount) ) FROM ledger l WHERE l.type IN ('reserve','release') AND l.source_id=u.id),0) AS available
 FROM users u;
--> statement-breakpoint
CREATE TRIGGER ledger_validate BEFORE INSERT ON ledger BEGIN
 SELECT RAISE(ABORT,'invalid_ledger') WHERE NEW.amount<=0 OR typeof(NEW.amount)<>'integer' OR NEW.status<>'posted' OR NEW.type NOT IN ('onboarding','transfer','adjustment','reserve','release');
 SELECT RAISE(ABORT,'self_payment') WHERE NEW.source_id IS NOT NULL AND NEW.source_id=NEW.destination_id;
 SELECT RAISE(ABORT,'invalid_issuance') WHERE NEW.type IN ('onboarding','adjustment') AND ((NEW.source_id IS NULL)=(NEW.destination_id IS NULL));
 SELECT RAISE(ABORT,'invalid_transfer') WHERE NEW.type='transfer' AND (NEW.source_id IS NULL OR NEW.destination_id IS NULL OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND status='completed' AND requester_id=NEW.source_id AND helper_id=NEW.destination_id AND actual_seconds=NEW.amount));
 SELECT RAISE(ABORT,'invalid_reservation') WHERE NEW.type IN ('reserve','release') AND (NEW.destination_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND requester_id=NEW.source_id AND estimated_seconds=NEW.amount));
 SELECT RAISE(ABORT,'invalid_reservation') WHERE NEW.type='reserve' AND NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND status='open');
 SELECT RAISE(ABORT,'invalid_release') WHERE NEW.type='release' AND NOT EXISTS(SELECT 1 FROM ledger WHERE task_id=NEW.task_id AND type='reserve' AND amount=NEW.amount);
END;
--> statement-breakpoint
CREATE TRIGGER ledger_no_update BEFORE UPDATE ON ledger BEGIN SELECT RAISE(ABORT,'immutable_ledger'); END;
--> statement-breakpoint
CREATE TRIGGER ledger_balance_guard BEFORE INSERT ON ledger WHEN NEW.source_id IS NOT NULL AND NEW.type IN ('reserve','transfer','adjustment') BEGIN
 SELECT RAISE(ABORT,'insufficient_credit') WHERE NEW.amount>COALESCE((SELECT available FROM balances WHERE user_id=NEW.source_id),0);
END;
--> statement-breakpoint
CREATE TRIGGER ledger_no_delete BEFORE DELETE ON ledger BEGIN SELECT RAISE(ABORT,'immutable_ledger'); END;
--> statement-breakpoint
CREATE TRIGGER audit_no_update BEFORE UPDATE ON admin_actions BEGIN SELECT RAISE(ABORT,'immutable_audit'); END;
--> statement-breakpoint
CREATE TRIGGER audit_no_delete BEFORE DELETE ON admin_actions BEGIN SELECT RAISE(ABORT,'immutable_audit'); END;
--> statement-breakpoint
CREATE TRIGGER onboard AFTER INSERT ON users WHEN CAST((SELECT value FROM settings WHERE id='onboarding_seconds') AS INTEGER)>0 BEGIN
 INSERT INTO ledger(id,destination_id,amount,type,metadata) VALUES(lower(hex(randomblob(16))),NEW.id,CAST((SELECT value FROM settings WHERE id='onboarding_seconds') AS INTEGER),'onboarding','Community onboarding policy at registration');
END;
--> statement-breakpoint
CREATE TRIGGER task_validate BEFORE INSERT ON tasks BEGIN
 SELECT RAISE(ABORT,'invalid_task') WHERE NEW.status<>'open' OR NEW.helper_id IS NOT NULL OR NEW.estimated_seconds<=0 OR typeof(NEW.estimated_seconds)<>'integer' OR NEW.remote NOT IN (0,1);
END;
--> statement-breakpoint
CREATE TRIGGER task_reserve AFTER INSERT ON tasks BEGIN
 INSERT INTO ledger(id,source_id,task_id,amount,type,actor_id,metadata) VALUES(lower(hex(randomblob(16))),NEW.requester_id,NEW.id,NEW.estimated_seconds,'reserve',NEW.requester_id,'Time held for request');
END;
--> statement-breakpoint
CREATE TRIGGER task_transition BEFORE UPDATE ON tasks BEGIN
 SELECT RAISE(ABORT,'invalid_task_change') WHERE NEW.requester_id<>OLD.requester_id OR NEW.estimated_seconds<>OLD.estimated_seconds OR NEW.helper_id=NEW.requester_id;
 SELECT RAISE(ABORT,'helper_locked') WHERE OLD.helper_id IS NOT NULL AND NEW.helper_id IS NOT OLD.helper_id;
 SELECT RAISE(ABORT,'task_final') WHERE OLD.status IN ('completed','cancelled');
 SELECT RAISE(ABORT,'invalid_transition') WHERE NEW.status<>OLD.status AND NOT (
 (OLD.status='open' AND NEW.status IN ('accepted','cancelled')) OR
 (OLD.status='accepted' AND NEW.status IN ('in_progress','cancelled','disputed')) OR
 (OLD.status='in_progress' AND NEW.status IN ('awaiting_confirmation','disputed','cancelled')) OR
 (OLD.status='awaiting_confirmation' AND NEW.status IN ('completed','disputed','cancelled')) OR
 (OLD.status='disputed' AND NEW.status IN ('completed','cancelled')));
 SELECT RAISE(ABORT,'missing_helper') WHERE NEW.status='accepted' AND NEW.helper_id IS NULL;
 SELECT RAISE(ABORT,'start_confirmation_required') WHERE NEW.status='in_progress' AND (NEW.requester_ready<>1 OR NEW.helper_ready<>1 OR NEW.started_at IS NULL);
 SELECT RAISE(ABORT,'invalid_duration') WHERE NEW.status IN ('awaiting_confirmation','completed') AND (NEW.finished_at IS NULL OR NEW.started_at IS NULL OR NEW.actual_seconds<>MAX(1,NEW.finished_at-NEW.started_at));
 SELECT RAISE(ABORT,'confirmation_required') WHERE NEW.status='completed' AND (NEW.confirmed_by IS NULL OR NEW.confirmed_at IS NULL OR NEW.helper_id IS NULL OR (NEW.confirmed_by=NEW.finished_by AND NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.confirmed_by AND role='admin')));
END;
--> statement-breakpoint
CREATE TRIGGER task_release AFTER UPDATE OF status ON tasks WHEN NEW.status IN ('completed','cancelled') AND OLD.status<>NEW.status BEGIN
 INSERT INTO ledger(id,source_id,task_id,amount,type,metadata) VALUES(lower(hex(randomblob(16))),NEW.requester_id,NEW.id,NEW.estimated_seconds,'release','Reservation released');
 INSERT INTO ledger(id,source_id,destination_id,task_id,amount,type,actor_id,metadata) SELECT lower(hex(randomblob(16))),NEW.requester_id,NEW.helper_id,NEW.id,NEW.actual_seconds,'transfer',NEW.confirmed_by,'Confirmed service duration in seconds' WHERE NEW.status='completed';
END;
--> statement-breakpoint
CREATE TRIGGER task_notify AFTER UPDATE ON tasks WHEN NEW.status<>OLD.status OR NEW.requester_ready<>OLD.requester_ready OR NEW.helper_ready<>OLD.helper_ready BEGIN
 INSERT INTO notifications(id,user_id,task_id,text) VALUES(lower(hex(randomblob(16))),NEW.requester_id,NEW.id,NEW.title||': '|| IIF(NEW.status='accepted','Matched with '||(SELECT name FROM users WHERE id=NEW.helper_id)||'. Confirm when you are ready to begin.',IIF(NEW.status='in_progress','Both participants are ready. Your time together has begun.',IIF(NEW.status='awaiting_confirmation','Finished. The other participant must review and confirm the recorded time.',IIF(NEW.status='completed','Completed. Time Credit has been spent for the confirmed service.',IIF(NEW.status='cancelled','Cancelled. Your reserved time has been released.',IIF(NEW.status='disputed','A problem has been reported. Credits remain held for administrator review.',NEW.status)))))) );
 INSERT INTO notifications(id,user_id,task_id,text) SELECT lower(hex(randomblob(16))),NEW.helper_id,NEW.id,NEW.title||': '|| IIF(NEW.status='completed','Completed. Time Credit earned has been added to your account.',IIF(NEW.status='accepted','Start confirmation updated. Both participants must be ready.',IIF(NEW.status='in_progress','Time together has begun.',IIF(NEW.status='awaiting_confirmation','Finished. Please review the completion details.',IIF(NEW.status='disputed','A problem has been reported for administrator review.',IIF(NEW.status='cancelled','This task was cancelled.',NEW.status)))))) WHERE NEW.helper_id IS NOT NULL;
 INSERT INTO notifications(id,user_id,task_id,text) SELECT lower(hex(randomblob(16))),id,NEW.id,NEW.title||': Dispute requires administrator review.' FROM users WHERE role='admin' AND NEW.status='disputed';
END;
--> statement-breakpoint
CREATE TRIGGER review_validate BEFORE INSERT ON reviews BEGIN
 SELECT RAISE(ABORT,'invalid_review') WHERE NEW.rating<1 OR NEW.rating>5 OR NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND status='completed' AND ((requester_id=NEW.author_id AND helper_id=NEW.recipient_id) OR (helper_id=NEW.author_id AND requester_id=NEW.recipient_id)));
END;
--> statement-breakpoint
CREATE TRIGGER message_validate BEFORE INSERT ON messages BEGIN
 SELECT RAISE(ABORT,'private_messages') WHERE NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND helper_id IS NOT NULL AND (requester_id=NEW.sender_id OR helper_id=NEW.sender_id));
END;
--> statement-breakpoint
CREATE TRIGGER message_notify AFTER INSERT ON messages BEGIN
 INSERT INTO notifications(id,user_id,task_id,text) SELECT lower(hex(randomblob(16))), IIF(requester_id=NEW.sender_id,helper_id,requester_id) ,id,title||': New message from '||(SELECT name FROM users WHERE id=NEW.sender_id) FROM tasks WHERE id=NEW.task_id;
END;

--> statement-breakpoint
CREATE TRIGGER task_events_no_update BEFORE UPDATE ON task_events BEGIN SELECT RAISE(ABORT,'immutable_task_history'); END;
--> statement-breakpoint
CREATE TRIGGER task_events_no_delete BEFORE DELETE ON task_events BEGIN SELECT RAISE(ABORT,'immutable_task_history'); END;
