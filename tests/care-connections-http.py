"""Isolated synthetic tests: conversation persistence and family contact ownership."""
import json,urllib.request,urllib.error,hashlib,sqlite3,glob,time
from pathlib import Path
base='http://127.0.0.1:8789'
db=next(p for p in glob.glob('/tmp/silver-partner-qa-state/v3/d1/miniflare-D1DatabaseObject/*.sqlite') if not p.endswith('metadata.sqlite'))
c=sqlite3.connect(db)
if not c.execute("SELECT name FROM sqlite_master WHERE name='care_conversations'").fetchone():c.executescript(Path('drizzle/0013_fine_sandman.sql').read_text())
for name in ['alice','bob','reviewer']:
 token=hashlib.sha256(('isolated-partner-fixture:'+name).encode()).hexdigest()
 c.execute('UPDATE sessions SET expires=? WHERE id=?',(int(time.time())+86400,hashlib.sha256(token.encode()).hexdigest()))
c.commit();count=0
def call(user,path,data=None,status=200):
 global count
 h={'Origin':base,'Content-Type':'application/json'}
 if user:h['Cookie']='tb_session='+hashlib.sha256(('isolated-partner-fixture:'+user).encode()).hexdigest()
 req=urllib.request.Request(base+'/api/'+path,headers=h,data=json.dumps(data).encode() if data is not None else None)
 try:r=urllib.request.urlopen(req)
 except urllib.error.HTTPError as e:r=e
 v=json.load(r);assert r.status==status,(path,r.status,status,v);count+=1;return v
for u in ['alice','bob','reviewer']:call(u,'care/setup',{'consent':True})
for path in ['conversations','family']:call(None,'care/'+path,status=401)
messages=[{'role':'user','content':'Synthetic conversation persistence check.'},{'role':'assistant','content':'Synthetic response for storage testing.'}]
body={'consent':True,'messages':messages}
call('alice','care/save-conversation',{**body,'consent':False},400)
s=call('alice','care/save-conversation',body)
assert call('alice','care/conversation?id='+s['id'])['messages']==messages
assert any(x['id']==s['id'] for x in call('alice','care/conversations')['conversations'])
for other in ['bob','reviewer']:
 call(other,'care/conversation?id='+s['id'],status=404)
 call(other,'care/save-conversation',{**body,**s},404)
 call(other,'care/delete-conversation',{'id':s['id']},404)
call('alice','care/save-conversation',{**body,**s})
call('alice','care/save-conversation',{**body,**s},409)
contact={'name':'Test family contact','relationship':'Synthetic sibling','phone':'+12025550123'}
f=call('alice','care/family-contact',contact)
call('alice','care/family-contact',{**contact,'phone':'javascript:alert(1)'},400)
assert any(x['id']==f['id'] for x in call('alice','care/family')['contacts'])
assert all(x['id']!=f['id'] for x in call('bob','care/family')['contacts'])
call('bob','care/family-contact',{**contact,**f,'version':1},404)
call('bob','care/delete-family-contact',f,404)
call('alice','care/family-contact',{**contact,**f,'version':1,'name':'Updated test contact'})
call('alice','care/family-contact',{**contact,**f,'version':1},409)
call('alice','care/delete-family-contact',f)
call('alice','care/delete-conversation',{'id':s['id']})
call('alice','care/conversation?id='+s['id'],status=404)
# Retain explicitly synthetic UI fixtures for visual checks.
call('alice','care/save-conversation',body)
call('alice','care/family-contact',contact)
print(f'PASS: {count} consent, ownership, persistence, validation and conflict checks')
