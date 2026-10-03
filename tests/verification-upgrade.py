"""Upgrade preserves existing members and allows completion without false verification."""
import sqlite3,glob
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON')
files=sorted(glob.glob('drizzle/*.sql'))
for f in files[:9]:c.executescript(open(f).read())
c.execute("INSERT INTO settings VALUES('onboarding_seconds','10800')")
for id in ['old-requester','old-helper']:
 c.execute('INSERT INTO users(id,email,name,password,recovery) VALUES(?,?,?,?,?)',(id,id+'@test.invalid',id,'test','test'))
c.execute("INSERT INTO categories VALUES('c','Test',1)")
c.execute("INSERT INTO tasks(id,requester_id,title,description,category_id,location,estimated_seconds,remote,requested_at) VALUES('t','old-requester','Existing task','Test','c','Test',60,0,unixepoch()+3600)")
c.execute("UPDATE tasks SET helper_id='old-helper',status='accepted' WHERE id='t'")
ledger=c.execute('SELECT * FROM ledger ORDER BY id').fetchall()
for f in files[9:]:c.executescript(open(f).read())
assert ledger==c.execute('SELECT * FROM ledger ORDER BY id').fetchall()
assert c.execute('SELECT count(*) FROM identity_verifications').fetchone()[0]==0
# Existing participants keep private messages and finish their existing commitment.
c.execute("INSERT INTO messages(id,task_id,sender_id,content) VALUES('m','t','old-helper','Existing conversation preserved')")
c.execute("UPDATE tasks SET requested_at=unixepoch()-90 WHERE id='t'")
c.execute("UPDATE tasks SET requester_agreed=1,helper_agreed=1 WHERE id='t'")
c.execute("UPDATE tasks SET requester_ready=1,helper_ready=1,status='in_progress',started_at=unixepoch()-60 WHERE id='t'")
c.execute("UPDATE tasks SET status='awaiting_confirmation',finished_at=started_at+60,actual_seconds=60,finished_by='old-helper' WHERE id='t'")
c.execute("UPDATE tasks SET status='completed',confirmed_at=unixepoch(),confirmed_by='old-requester' WHERE id='t'")
assert c.execute("SELECT total FROM balances WHERE user_id='old-helper'").fetchone()[0]==10860
print('PASS: migration preserves prior balances; no false approval; existing private chat and full task completion still work.')
c.execute("INSERT INTO users(id,email,name,password,recovery,role) VALUES('reviewer','reviewer@test.invalid','Reviewer','test','test','admin')")
c.execute("INSERT INTO identity_verifications(user_id,legal_name,birth_date,status) VALUES('old-helper','Existing member','1990-01-01','under_review')")
c.execute("UPDATE identity_verifications SET status='verified',age_eligible=1,duplicate_status='clear',identity_key='old-helper-identity',reviewer_id='reviewer',verified_at=unixepoch(),evidence_reference='Original checked' WHERE user_id='old-helper'")
assert c.execute("SELECT count(*) FROM ledger WHERE destination_id='old-helper' AND type='onboarding'").fetchone()[0]==1
assert c.execute("SELECT total FROM balances WHERE user_id='old-helper'").fetchone()[0]==10860
print('PASS: verifying an existing member never issues a second starter grant.')
