CREATE TABLE task_inquiry_messages (
 id TEXT PRIMARY KEY NOT NULL,
 task_id TEXT NOT NULL REFERENCES tasks(id),
 visitor_id TEXT NOT NULL REFERENCES users(id),
 sender_id TEXT NOT NULL REFERENCES users(id),
 content TEXT NOT NULL,
 photo TEXT,
 created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX inquiry_thread ON task_inquiry_messages(task_id,visitor_id,created_at);
INSERT INTO task_inquiry_messages(id,task_id,visitor_id,sender_id,content,photo,created_at) SELECT m.id,m.task_id,t.helper_id,m.sender_id,m.content,m.photo,m.created_at FROM messages m JOIN tasks t ON t.id=m.task_id WHERE t.helper_id IS NOT NULL;
CREATE TRIGGER inquiry_validate BEFORE INSERT ON task_inquiry_messages BEGIN
 SELECT RAISE(ABORT,'private_messages') WHERE NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND requester_id<>NEW.visitor_id AND NEW.sender_id IN (requester_id,NEW.visitor_id) AND (status='open' OR helper_id=NEW.visitor_id));
END;
CREATE TRIGGER inquiry_notify AFTER INSERT ON task_inquiry_messages BEGIN
 INSERT INTO notifications(id,user_id,task_id,text) SELECT lower(hex(randomblob(16))),IIF(NEW.sender_id=requester_id,NEW.visitor_id,requester_id),id,title||': New message from '||(SELECT name FROM users WHERE id=NEW.sender_id) FROM tasks WHERE id=NEW.task_id;
END;
