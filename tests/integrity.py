"""Database safety checks against an in-memory SQLite database, never product data."""
import sqlite3,glob,uuid
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON')
for p in sorted(glob.glob('drizzle/*.sql')):c.executescript(open(p).read())
checks=0
def q(sql,*args):return c.execute(sql,args)
def fails(sql,*args):
 global checks
 try:q(sql,*args)
 except sqlite3.DatabaseError:checks+=1
 else:raise AssertionError('Expected rejection: '+sql)
q("INSERT INTO settings VALUES('onboarding_seconds','120')")
for u in ['requester','helper','outsider']:q("INSERT INTO users(id,email,name,password,recovery,location) VALUES(?,?,?,?,?,?)",u,u+'@test.invalid',u,'test hash','test hash','Test only')
from verified_fixture import verify_members
verify_members(c)
q("INSERT INTO categories VALUES('category','Test category',1)")
fails("INSERT INTO ledger(id,destination_id,amount,type,metadata) VALUES('duplicate','requester',120,'onboarding','duplicate')")
fails("UPDATE ledger SET amount=999")
fails("DELETE FROM ledger")
q("INSERT INTO tasks(id,requester_id,title,description,category_id,location,remote,estimated_seconds,requested_at) VALUES('task','requester','Test','Test','category','Test',1,60,unixepoch()+86400)")
fails("UPDATE tasks SET status='completed' WHERE id='task'")
fails("UPDATE tasks SET helper_id='requester',status='accepted' WHERE id='task'")
q("UPDATE tasks SET helper_id='helper',status='accepted' WHERE id='task'")
fails("UPDATE tasks SET helper_id='outsider' WHERE id='task'")
fails("UPDATE tasks SET status='in_progress',started_at=unixepoch() WHERE id='task'")
q("UPDATE tasks SET requested_at=unixepoch()-180 WHERE id='task'")
q("UPDATE tasks SET requester_agreed=1,helper_agreed=1 WHERE id='task'")
q("UPDATE tasks SET requester_ready=1,helper_ready=1,status='in_progress',started_at=unixepoch()-180 WHERE id='task'")
q("UPDATE tasks SET status='awaiting_confirmation',finished_at=started_at+180,actual_seconds=180,finished_by='helper' WHERE id='task'")
fails("UPDATE tasks SET status='completed',confirmed_by='requester',confirmed_at=unixepoch() WHERE id='task'")
assert q("SELECT status FROM tasks WHERE id='task'").fetchone()[0]=='awaiting_confirmation'
assert q("SELECT available,reserved FROM balances WHERE user_id='requester'").fetchone()==(60,60)
q("INSERT INTO ledger(id,destination_id,amount,type,metadata) VALUES('adjust','requester',60,'adjustment','Audited test credit')")
q("UPDATE tasks SET status='completed',confirmed_by='requester',confirmed_at=unixepoch() WHERE id='task'")
assert q("SELECT available,reserved FROM balances WHERE user_id='requester'").fetchone()==(0,0)
assert q("SELECT available FROM balances WHERE user_id='helper'").fetchone()[0]==300
q("INSERT INTO agreement_acceptances(id,user_id,kind,version,signature) VALUES('consent','requester','community','test','Test')")
fails("UPDATE agreement_acceptances SET signature='rewrite'")
fails("DELETE FROM agreement_acceptances")
fails("UPDATE tasks SET status='completed',confirmed_at=unixepoch() WHERE id='task'")
fails("INSERT INTO ledger(id,source_id,destination_id,task_id,amount,type,metadata) VALUES('again','requester','helper','task',180,'transfer','Repeat')")
fails("INSERT INTO reviews(id,task_id,author_id,recipient_id,rating,feedback) VALUES('bad','task','outsider','helper',5,'No participation')")
fails("INSERT INTO messages(id,task_id,sender_id,content) VALUES('bad','task','outsider','No access')")
q("INSERT INTO admin_actions(id,actor_id,action,target_id,reason) VALUES('audit','requester','test','test','test')")
fails("DELETE FROM admin_actions")
fails("UPDATE admin_actions SET reason='rewrite'")
print(f'PASS: {checks} SQL-level rejection checks; insufficient-funds rejection, immutable history, onboarding uniqueness, and exact settlement conservation.')
