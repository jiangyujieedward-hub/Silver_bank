"""Private inquiry isolation checks using only an in-memory database."""
import sqlite3,glob
c=sqlite3.connect(':memory:');c.execute('pragma foreign_keys=on')
for f in sorted(glob.glob('drizzle/*.sql')):c.executescript(open(f).read())
c.execute("INSERT INTO settings VALUES('onboarding_seconds','10800')")
for u in ['owner','first','second']:
 c.execute('INSERT INTO users(id,email,name,password,recovery) VALUES(?,?,?,?,?)',(u,u+'@example.test',u,'test','test'))
from verified_fixture import verify_members
verify_members(c)
c.execute("INSERT INTO categories VALUES('help','Help',1)")
c.execute("INSERT INTO tasks(id,requester_id,title,description,category_id,location,estimated_seconds,remote,requested_at) VALUES('t','owner','Test','Test','help','Test',60,1,unixepoch()+3600)")
def send(i,visitor,sender):c.execute('INSERT INTO task_inquiry_messages(id,task_id,visitor_id,sender_id,content) VALUES(?,?,?,?,?)',(i,'t',visitor,sender,'Test'))
send('one','first','first');send('two','second','second');send('reply','first','owner')
assert c.execute("SELECT count(*) FROM task_inquiry_messages WHERE task_id='t' AND visitor_id='first'").fetchone()[0]==2
try:send('intruder','first','second');raise AssertionError('Third party allowed')
except sqlite3.IntegrityError:pass
assert c.execute("SELECT count(*) FROM notifications WHERE user_id='first' AND task_id='t'").fetchone()[0]==1
assert c.execute("SELECT helper_id FROM tasks").fetchone()[0] is None
c.execute("UPDATE tasks SET helper_id='first',status='accepted' WHERE id='t'")
send('matched','first','owner')
try:send('late','second','second');raise AssertionError('Unmatched posting allowed')
except sqlite3.IntegrityError:pass
print('PASS: separate private threads; requester replies; outsider blocked; notifications; chat never accepts task; unmatched posting blocked after matching.')
