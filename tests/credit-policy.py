"""The three-hour policy, tested only in an isolated in-memory database."""
import sqlite3,glob
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON')
for file in sorted(glob.glob('drizzle/*.sql')):c.executescript(open(file).read())
c.execute("INSERT INTO settings VALUES('onboarding_seconds','10800')")
for member in ['requester','helper']:
 c.execute('INSERT INTO users(id,email,name,password,recovery,location) VALUES(?,?,?,?,?,?)',(member,member+'@example.test',member,'test','test','Test'))
c.execute("INSERT INTO categories VALUES('help','Test help',1)")
def available(member):return c.execute('SELECT available FROM balances WHERE user_id=?',(member,)).fetchone()[0]
def post(task,member,seconds):c.execute('INSERT INTO tasks(id,requester_id,title,description,category_id,location,estimated_seconds,remote,requested_at) VALUES(?,?,?,?,?,?,?,1,unixepoch()+86400)',(task,member,'Test','Test','help','Test',seconds))
def denied(task):
 try:post(task,'requester',60)
 except sqlite3.IntegrityError as e:assert 'insufficient_credit' in str(e)
 else:raise AssertionError('Insufficient credit was accepted')
def settle(task,helper,requester,seconds):
 c.execute("UPDATE tasks SET helper_id=?,status='accepted' WHERE id=?",(helper,task))
 c.execute("UPDATE tasks SET requested_at=unixepoch()-1 WHERE id=?",(task,))
 c.execute("UPDATE tasks SET requester_agreed=1,helper_agreed=1 WHERE id=?",(task,))
 c.execute("UPDATE tasks SET requester_ready=1,helper_ready=1,status='in_progress',started_at=unixepoch()-? WHERE id=?",(seconds,task))
 c.execute("UPDATE tasks SET status='awaiting_confirmation',finished_at=started_at+?,actual_seconds=?,finished_by=? WHERE id=?",(seconds,seconds,helper,task))
 c.execute("UPDATE tasks SET status='completed',confirmed_by=?,confirmed_at=unixepoch() WHERE id=?",(requester,task))
assert available('requester')==10800
post('first','requester',10800);assert available('requester')==0;denied('while-reserved')
settle('first','helper','requester',10800);assert available('requester')==0;denied('after-spending')
assert c.execute("SELECT COUNT(*) FROM ledger WHERE destination_id='requester' AND type='onboarding'").fetchone()[0]==1
post('give-back','helper',60);settle('give-back','requester','helper',60)
assert available('requester')==60
post('earned-request','requester',60);assert available('requester')==0
c.execute("UPDATE tasks SET status='cancelled' WHERE id='earned-request'");assert available('requester')==60
assert c.execute('SELECT SUM(total) FROM balances').fetchone()[0]==21600
print('PASS: one starter grant; three hours reserved/spent; further requests blocked; earning unlocks requests; cancellations return reserved credit; total time conserved.')
