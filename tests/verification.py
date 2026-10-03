"""Verification/credit policy regression tests. Uses only an in-memory database."""
import sqlite3,glob
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON')
for f in sorted(glob.glob('drizzle/*.sql')):c.executescript(open(f).read())
c.execute("INSERT INTO settings VALUES('onboarding_seconds','10800')")
def user(id,kind='individual',role='member'):
 c.execute('INSERT INTO users(id,email,name,password,recovery,account_type,role) VALUES(?,?,?,?,?,?,?)',(id,id+'@example.test',id,'test','test',kind,role))
def reject(sql,args=()):
 try:c.execute(sql,args)
 except sqlite3.IntegrityError:return
 raise AssertionError('Expected database rejection: '+sql)
user('admin',role='admin');user('a');user('b');user('ngo','organization')
assert c.execute('SELECT count(*) FROM ledger').fetchone()[0]==0
for id in ['a','b']:
 c.execute("INSERT INTO identity_verifications(user_id,legal_name,birth_date,status) VALUES(?,?,?,'submitted')",(id,id,'1990-01-01'))
reject("UPDATE identity_verifications SET status='verified' WHERE user_id='a'")
def approve(id,key):
 c.execute("UPDATE identity_verifications SET status='verified',age_eligible=1,duplicate_status='clear',identity_key=?,reviewer_id='admin',verified_at=unixepoch(),evidence_reference='test reviewed original' WHERE user_id=?",(key,id))
approve('a','unique-identity')
assert c.execute("SELECT available FROM balances WHERE user_id='a'").fetchone()[0]==10800
reject("UPDATE identity_verifications SET status='verified',age_eligible=1,duplicate_status='clear',identity_key='unique-identity',reviewer_id='admin',verified_at=unixepoch(),evidence_reference='test' WHERE user_id='b'")
assert c.execute("SELECT available FROM balances WHERE user_id='b'").fetchone()[0]==0
c.execute("UPDATE identity_verifications SET status='under_review' WHERE user_id='a'");approve('a','unique-identity')
assert c.execute("SELECT COUNT(*) FROM ledger WHERE destination_id='a' AND type='onboarding'").fetchone()[0]==1
c.execute("INSERT INTO categories VALUES('c','Test',1)")
insert="INSERT INTO tasks(id,requester_id,title,description,category_id,location,estimated_seconds,remote,requested_at) VALUES(?,?,'Test','Test','c','Test',60,0,unixepoch()+3600)"
reject(insert,('pending','b'));reject(insert,('ngo-task','ngo'))
c.execute(insert,('ok','a'))
reject("UPDATE tasks SET helper_id='b',status='accepted' WHERE id='ok'")
reject("UPDATE users SET account_type='organization' WHERE id='a'")
c.execute("INSERT INTO organizations(id,legal_name,jurisdiction,entity_type,registration_id,registered_address,contact_email,contact_phone,mission,representative_name,representative_role,representative_email) VALUES('o','Test','HK','charity','123','Test','a@test.invalid','1','Test','Rep','Owner','a@test.invalid')")
reject("UPDATE organizations SET status='verified' WHERE id='o'")
reject("UPDATE organizations SET status='verified',registry_checked=1,representative_checked=0,evidence_reference='registry',reviewer_id='admin',verified_at=unixepoch(),review_due=unixepoch()+3600 WHERE id='o'")
c.execute("UPDATE organizations SET status='verified',registry_checked=1,representative_checked=1,evidence_reference='registry and authorization',reviewer_id='admin',verified_at=unixepoch(),review_due=unixepoch()+3600 WHERE id='o'")
assert c.execute("SELECT available FROM balances WHERE user_id='ngo'").fetchone()[0]==0
print('PASS: pending accounts receive no credit; approval requires evidence; duplicate identities blocked; starter credit issued once; unverified tasks blocked; organization legitimacy AND representative authority required; account type immutable.')
