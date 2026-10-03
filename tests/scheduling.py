"""Isolated scheduling guards: no live accounts or tasks are changed."""
import sqlite3,glob
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON')
for file in sorted(glob.glob('drizzle/*.sql')):c.executescript(open(file).read())
c.execute("INSERT INTO settings VALUES('onboarding_seconds','10800')")
for member in ['r','h']:
 c.execute('INSERT INTO users(id,email,name,password,recovery) VALUES(?,?,?,?,?)',(member,member+'@example.test',member,'test','test'))
from verified_fixture import verify_members
verify_members(c)
c.execute("INSERT INTO categories VALUES('help','Help',1)")
c.execute("INSERT INTO tasks(id,requester_id,title,description,category_id,location,estimated_seconds,remote,requested_at) VALUES('t','r','Test','Test','help','Test',3600,1,unixepoch()+3600)")
c.execute("UPDATE tasks SET helper_id='h',status='accepted' WHERE id='t'")
c.execute("UPDATE tasks SET requester_agreed=1,helper_agreed=1 WHERE id='t'")
assert c.execute("SELECT status,started_at FROM tasks").fetchone()==('accepted',None)
def denied(sql):
 try:c.execute(sql)
 except sqlite3.IntegrityError:return
 raise AssertionError('Forbidden start or date change allowed')
denied("UPDATE tasks SET requester_ready=1 WHERE id='t'")
denied("UPDATE tasks SET requester_ready=1,helper_ready=1,status='in_progress',started_at=unixepoch() WHERE id='t'")
denied("UPDATE tasks SET requested_at=unixepoch()-1 WHERE id='t'")
c.execute("UPDATE tasks SET requested_at=unixepoch()-1,requester_agreed=0,helper_agreed=0 WHERE id='t'")
denied("UPDATE tasks SET requester_ready=1 WHERE id='t'")
c.execute("UPDATE tasks SET requester_agreed=1,helper_agreed=1 WHERE id='t'")
reminder="INSERT OR IGNORE INTO notifications(id,user_id,task_id,text) SELECT 'reminder:'||id||':'||requested_at||':r','r',id,title FROM tasks WHERE status='accepted' AND requester_agreed=1 AND helper_agreed=1 AND requested_at<=unixepoch()"
c.execute(reminder);c.execute(reminder)
assert c.execute("SELECT count(*) FROM notifications WHERE id LIKE 'reminder:%'").fetchone()[0]==1
c.execute("UPDATE tasks SET requester_ready=1 WHERE id='t'")
assert c.execute('SELECT started_at FROM tasks').fetchone()[0] is None
c.execute("UPDATE tasks SET helper_ready=1,status='in_progress',started_at=unixepoch() WHERE id='t'")
assert c.execute('SELECT started_at FROM tasks').fetchone()[0] is not None
print('PASS: agreement does not start timer; early starts blocked; date changes reset agreement; due reminder idempotent; both start confirmations required.')
