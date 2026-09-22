ALTER TABLE tasks ADD COLUMN requester_agreed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN helper_agreed INTEGER NOT NULL DEFAULT 0;
-- Old ready flags must not start a scheduled task without a fresh confirmation.
UPDATE tasks SET requester_ready=0,helper_ready=0 WHERE status='accepted';
CREATE TRIGGER scheduled_start_guard BEFORE UPDATE ON tasks WHEN OLD.status='accepted' BEGIN
 SELECT RAISE(ABORT,'scheduled_start_required') WHERE
 (NEW.requester_ready=1 OR NEW.helper_ready=1 OR NEW.status='in_progress') AND
 (NEW.requester_agreed<>1 OR NEW.helper_agreed<>1 OR NEW.requested_at>unixepoch());
 SELECT RAISE(ABORT,'schedule_reconfirmation_required') WHERE NEW.requested_at<>OLD.requested_at AND (NEW.requester_agreed<>0 OR NEW.helper_agreed<>0 OR NEW.requester_ready<>0 OR NEW.helper_ready<>0);
END;
CREATE TRIGGER schedule_notify AFTER UPDATE ON tasks WHEN NEW.requested_at<>OLD.requested_at OR NEW.requester_agreed<>OLD.requester_agreed OR NEW.helper_agreed<>OLD.helper_agreed BEGIN
 INSERT INTO notifications(id,user_id,task_id,text) SELECT lower(hex(randomblob(16))),id,NEW.id,NEW.title||': '||IIF(NEW.requested_at<>OLD.requested_at,'Date changed. Both participants must confirm the new date.',IIF(NEW.requester_agreed=1 AND NEW.helper_agreed=1,'Scheduled. Add a calendar reminder. Start together at the agreed time.','Date confirmation received. Waiting for the other participant.')) FROM users WHERE id IN (NEW.requester_id,NEW.helper_id);
END;

DROP TRIGGER task_notify;
CREATE TRIGGER task_notify AFTER UPDATE ON tasks WHEN NEW.status<>OLD.status OR NEW.requester_ready<>OLD.requester_ready OR NEW.helper_ready<>OLD.helper_ready BEGIN
 INSERT INTO notifications(id,user_id,task_id,text) VALUES(lower(hex(randomblob(16))),NEW.requester_id,NEW.id,NEW.title||': '|| IIF(NEW.status='accepted','Matched with '||(SELECT name FROM users WHERE id=NEW.helper_id)||'. Contact your partner and confirm the requested date.',IIF(NEW.status='in_progress','Both participants are ready. Your time together has begun.',IIF(NEW.status='awaiting_confirmation','Finished. The other participant must review and confirm the recorded time.',IIF(NEW.status='completed','Completed. Time Credit has been spent for the confirmed service.',IIF(NEW.status='cancelled','Cancelled. Your reserved time has been released.',IIF(NEW.status='disputed','A problem has been reported. Credits remain held for administrator review.',NEW.status)))))) );
 INSERT INTO notifications(id,user_id,task_id,text) SELECT lower(hex(randomblob(16))),NEW.helper_id,NEW.id,NEW.title||': '|| IIF(NEW.status='completed','Completed. Time Credit earned has been added to your account.',IIF(NEW.status='accepted','Check the agreed date. Start only when both participants are ready at that time.',IIF(NEW.status='in_progress','Time together has begun.',IIF(NEW.status='awaiting_confirmation','Finished. Please review the completion details.',IIF(NEW.status='disputed','A problem has been reported for administrator review.',IIF(NEW.status='cancelled','This task was cancelled.',NEW.status)))))) WHERE NEW.helper_id IS NOT NULL;
 INSERT INTO notifications(id,user_id,task_id,text) SELECT lower(hex(randomblob(16))),id,NEW.id,NEW.title||': Dispute requires administrator review.' FROM users WHERE role='admin' AND NEW.status='disputed';
END;
