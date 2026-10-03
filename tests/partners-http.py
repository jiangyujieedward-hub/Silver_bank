"""Synthetic integration test. Only the isolated localhost:8789 test database."""
import sqlite3,glob,json,hashlib,time,urllib.request,urllib.error,uuid,sys
paths=glob.glob('/tmp/silver-partner-qa-state/v3/d1/miniflare-D1DatabaseObject/*.sqlite')
path=next(p for p in paths if not p.endswith('metadata.sqlite'))
assert path.startswith('/tmp/silver-partner-qa-state/')
c=sqlite3.connect(path)
tokens={n:hashlib.sha256(('isolated-partner-fixture:'+n).encode()).hexdigest() for n in ['reviewer','owner','other','alice','bob','staff','trainer']}
if '--run-only' not in sys.argv:
 c=sqlite3.connect(path);c.execute('PRAGMA foreign_keys=OFF')
 for typ,name in c.execute("SELECT type,name FROM sqlite_master WHERE type IN ('trigger','view','table') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY CASE type WHEN 'trigger' THEN 0 WHEN 'view' THEN 1 ELSE 2 END").fetchall():
  c.execute('DROP '+typ+' IF EXISTS "'+name+'"')
 c.commit();c.execute('PRAGMA foreign_keys=ON')
 for f in sorted(glob.glob('drizzle/*.sql')):c.executescript(open(f).read())
 c.execute("INSERT INTO settings VALUES('configured','1')")
 c.execute("INSERT INTO settings VALUES('onboarding_seconds','10800')")
 pw='SyntheticPartnerTest!2026';salt='synthetic-test';digest=hashlib.pbkdf2_hmac('sha256',pw.encode(),salt.encode(),100000).hex()
 tokens={}
 for name,kind,role in [('reviewer','individual','admin'),('owner','organization','member'),('other','organization','member'),('alice','individual','member'),('bob','individual','member'),('staff','individual','member'),('trainer','individual','member')]:
  c.execute("INSERT INTO users(id,email,name,password,recovery,location,phone,age_band,account_type,role) VALUES(?,?,?,?,?,'Hong Kong S.A.R. / Sha Tin','+85212345678','25-34',?,?)",(name,name+'@partner.test',name.title(),salt+':'+digest,'test',kind,role))
  token=hashlib.sha256(('isolated-partner-fixture:'+name).encode()).hexdigest();tokens[name]=token
  c.execute("INSERT INTO sessions VALUES(?,?,?)",(hashlib.sha256(token.encode()).hexdigest(),name,int(time.time())+86400))
  for p in json.load(open('lib/policies.json')):c.execute("INSERT INTO agreement_acceptances(id,user_id,kind,version,signature) VALUES(?,?,?,?,?)",(uuid.uuid4().hex,name,p['kind'],p['version'],'Synthetic fixture'))
  if name in ['alice','bob','staff','trainer']:
   c.execute("INSERT INTO identity_verifications(user_id,birth_date) VALUES(?,'1990-01-01')",(name,))
   c.execute("UPDATE identity_verifications SET status='verified',age_eligible=1,duplicate_status='clear',identity_key=?,reviewer_id='reviewer',verified_at=unixepoch(),evidence_reference='Synthetic' WHERE user_id=?",(name,name))
 for org,owner in [('org','owner'),('other-org','other')]:
  c.execute("INSERT INTO organizations(id,legal_name,jurisdiction,entity_type,registration_id,registered_address,contact_email,contact_phone,mission,representative_name,representative_role,representative_email) VALUES(?,?,'TEST','Association',?,'Test address','test@example.test','123','Community connection','Test','Owner','test@example.test')",(org,org,org))
  c.execute("INSERT INTO organization_members VALUES(?,?,?,'owner',1)",(org,org,owner))
  c.execute("UPDATE organizations SET status='verified',registry_checked=1,representative_checked=1,evidence_reference='Synthetic evidence',reviewer_id='reviewer',verified_at=unixepoch(),review_due=unixepoch()+86400 WHERE id=?",(org,))
 c.execute("INSERT INTO organization_members VALUES('staff','org','staff','staff',1)")
 c.execute("INSERT INTO organization_members VALUES('trainer','org','trainer','training_manager',1)")
 c.execute("INSERT INTO ledger(id,destination_id,amount,type,metadata) VALUES('fund','owner',72000,'adjustment','Synthetic organization funding')")
 c.execute("INSERT INTO categories VALUES('category','Technology assistance',1)");c.commit()
if '--seed-only' in sys.argv:sys.exit(0)
count=0
def call(who,path,data=None,status=200):
 global count
 req=urllib.request.Request('http://127.0.0.1:8789/api/'+path,headers={'Cookie':'tb_session='+tokens[who],'Origin':'http://127.0.0.1:8789','Content-Type':'application/json'},data=json.dumps(data).encode() if data is not None else None)
 try:r=urllib.request.urlopen(req)
 except urllib.error.HTTPError as e:r=e
 v=json.loads(r.read());assert r.status==status,(path,r.status,v,status);count+=1;return v
def create(kind,**extra):
 return call('owner','partner/save',dict(organizationId='org',kind=kind,title='Test '+kind,description='Synthetic activity',location='Hong Kong S.A.R. / Sha Tin',categoryId='category',minutes=30,capacity=2,**extra))['id']
def publish(pid):
 d=call('owner','partner?organizationId=org');p=next(p for p in d['programs'] if p['id']==pid);call('owner','partner/publish',{'id':pid,'version':p['version'],'publish':True})
call('other','partner?organizationId=org',status=403)
call('staff','partner/save',{'organizationId':'org','kind':'community'},403)
call('trainer','partner/save',{'organizationId':'org','kind':'support'},403)
training=create('training',modules='Module one\nModule two',completion='Demonstrate safe support',badge='Digital support');publish(training)
task=create('task',requiredTrainingId=training,requestedAt='2099-01-01T10:00:00Z');publish(task)
tasks=call('alice','tasks');tid=next(t['id'] for t in tasks if t.get('partner_organization_id')=='org')
call('alice','tasks/'+tid+'/accept',{},403)
call('alice','programs/join',{'programId':training})
call('owner','partner/badge',{'programId':training,'userId':'alice','reason':'Early'},400)
call('alice','programs/progress',{'programId':training,'progress':'Both modules completed'})
call('trainer','partner/review',{'programId':training,'userId':'alice','status':'completed','reason':'Observed completion'})
call('trainer','partner/badge',{'programId':training,'userId':'alice','reason':'Evidence checked'})
call('alice','tasks/'+tid+'/accept',{})
call('owner','partner/task-action',{'taskId':tid,'action':'start'},409)
call('other','partner/task-action',{'taskId':tid,'action':'agree','requestedAt':4070944800},403)
call('owner','partner/badge',{'programId':training,'userId':'alice','reason':'Review needed','revoke':True})
second=next(t['id'] for t in tasks if t['id']!=tid)
call('alice','tasks/'+second+'/accept',{},403)
support=create('support',requirements='Explain support needed',budgetMinutes=90);publish(support)
before=call('alice','me')['balance']['total']
call('alice','programs/support',{'programId':support,'minutes':60,'reason':'Synthetic private need'})
d=call('owner','partner?organizationId=org');request=d['supports'][0]
assert call('staff','partner?organizationId=org')['supports']==[]
call('other','partner/support',{'id':request['id'],'approve':True,'reason':'No access'},403)
call('owner','partner/support',{'id':request['id'],'approve':True,'reason':'Eligible'})
assert call('alice','me')['balance']['total']==before+3600
call('owner','partner/support',{'id':request['id'],'approve':True,'reason':'Repeat'},409)
call('bob','programs/support',{'programId':support,'minutes':60,'reason':'Synthetic need'})
d=call('owner','partner?organizationId=org');req2=next(s for s in d['supports'] if s['user_id']=='bob')
call('owner','partner/support',{'id':req2['id'],'approve':True,'reason':'Over budget'},409)
assert next(s for s in call('owner','partner?organizationId=org')['supports'] if s['id']==req2['id'])['status']=='pending'
assert not call('bob','programs')['support'][0]['user_id']=='alice'
exchange=create('exchange',requestedAt='2099-01-01T10:00:00Z');publish(exchange)
call('alice','programs/join',{'programId':exchange,'role':'sharer'})
call('bob','programs/join',{'programId':exchange,'role':'learner'})
call('owner','partner/match',{'programId':exchange,'sharerId':'alice','learnerId':'bob','credited':True})
m=call('alice','programs')['matches'][0];assert m['task_id']
call('bob','tasks/'+m['task_id']+'/accept',{},403)
call('alice','tasks/'+m['task_id']+'/accept',{})
call('alice','programs/match-confirm',{'id':m['id']})
call('bob','programs/match-confirm',{'id':m['id']})
assert call('alice','programs')['matches'][0]['status']=='completed'

# Both parties must agree and start; organization confirmation uses existing settlement.
c.execute("UPDATE tasks SET requested_at=unixepoch()-120 WHERE id=?",(m['task_id'],));c.commit()
t=call('alice','tasks/'+m['task_id'])
call('owner','partner/task-action',{'taskId':m['task_id'],'action':'agree','requestedAt':t['requested_at']})
call('alice','tasks/'+m['task_id']+'/agree',{'requestedAt':t['requested_at']})
call('owner','partner/task-action',{'taskId':m['task_id'],'action':'start'})
assert call('alice','tasks/'+m['task_id'])['status']=='accepted'
call('alice','tasks/'+m['task_id']+'/start',{})
c.execute("UPDATE tasks SET started_at=unixepoch()-60 WHERE id=?",(m['task_id'],));c.commit()
call('alice','tasks/'+m['task_id']+'/finish',{})
before=call('alice','me')['balance']['total']
call('owner','partner/task-action',{'taskId':m['task_id'],'action':'confirm'})
assert call('alice','me')['balance']['total']>=before+60
call('owner','partner/task-action',{'taskId':m['task_id'],'action':'confirm'},409)
assert c.execute("SELECT COUNT(*) FROM ledger WHERE task_id=? AND type='transfer'",(m['task_id'],)).fetchone()[0]==1
# No participant can see another member's private request.
assert all(s['user_id']=='bob' for s in call('bob','programs')['support'])
# Owners can alter staff roles but regular staff cannot.
call('staff','partner/staff-role',{'organizationId':'org','userId':'trainer','role':'program_manager'},403)
call('owner','partner/staff-role',{'organizationId':'org','userId':'staff','role':'program_manager'})
call('owner','partner/staff-role',{'organizationId':'org','userId':'staff','role':'staff'})
# Publishing twice does not reserve or create additional places.
publish(task)
assert c.execute("SELECT COUNT(*) FROM partner_task_links WHERE program_id=?",(task,)).fetchone()[0]==2
# Capacity and expired verification
call('bob','programs/join',{'programId':training})
call('staff','programs/join',{'programId':training},409)
c.execute("UPDATE organizations SET review_due=unixepoch()-1 WHERE id='other-org'");c.commit()
call('other','partner?organizationId=other-org',status=403)

# Supported time is traced as amounts only, without exposing unrelated tasks.
personal=call('alice','tasks',{'title':'Private household task','description':'Private details','categoryId':'category','location':'Hong Kong S.A.R. / Sha Tin','minutes':5,'requestedAt':'2099-01-01T10:00:00Z'},status=201)['id']
call('bob','tasks/'+personal+'/accept',{})
c.execute("UPDATE tasks SET requested_at=unixepoch()-120 WHERE id=?",(personal,));c.commit()
when=call('alice','tasks/'+personal)['requested_at']
for who in ['alice','bob']:
 call(who,'tasks/'+personal+'/agree',{'requestedAt':when})
for who in ['alice','bob']:
 call(who,'tasks/'+personal+'/start',{})
c.execute("UPDATE tasks SET started_at=unixepoch()-60 WHERE id=?",(personal,));c.commit()
call('bob','tasks/'+personal+'/finish',{})
call('alice','tasks/'+personal+'/confirm',{})
d=call('owner','partner?organizationId=org')
assert next(s for s in d['supports'] if s['user_id']=='alice')['used']>=60
assert not any(t['id']==personal for t in d['tasks'])
assert not any(l['title']=='Private household task' for l in d['ledger'])
print(f'PASS: {count} HTTP assertions, organization isolation, staff roles, training gates, badge revoke, sponsorship conservation and rollback, skill matches, capacity, expired verification.')
