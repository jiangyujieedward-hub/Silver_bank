"""Real HTTP integration checks. Run ONLY against the isolated local test instance."""
import urllib.request,urllib.error,json,uuid,time,concurrent.futures,os
BASE='http://127.0.0.1:8787'
checks=0
class Client:
 def __init__(self):self.cookie=''
 def call(self,path,data=None,expected=200,origin=BASE):
  global checks
  headers={'Origin':origin,'Content-Type':'application/json'}
  if self.cookie:headers['Cookie']=self.cookie
  req=urllib.request.Request(BASE+'/api/'+path,data=json.dumps(data).encode() if data is not None else None,headers=headers)
  try:r=urllib.request.urlopen(req)
  except urllib.error.HTTPError as e:r=e
  result=json.loads(r.read());status=r.status
  if r.headers.get('Set-Cookie'):self.cookie=r.headers['Set-Cookie'].split(';')[0]
  if expected is not None:assert status==expected,(path,status,result,expected);checks+=1
  return result if expected is not None else (status,result)
policies=Client().call('policies')['policies']
consent={'signatureDrawing':'[[[100,100],[200,50],[350,170]]]', 'signature':'Integration participant','taskUnderstood':True,**{p['kind']+'Agreed':True for p in policies},**{p['kind']+'Version':p['version'] for p in policies}}
extra={'phone':'+85212345678','language':'zh-Hant','ageBand':'65-74',**consent}
seed=uuid.uuid4().hex
admin=Client();key=next(line.split('=',1)[1].strip() for line in open('.dev.vars') if line.startswith('ADMIN_SETUP_KEY='))
password=uuid.uuid4().hex+'!'
aemail='admin-'+seed+'@example.test'
admin.call('setup',{'email':aemail,'name':'Integration administrator','password':password,'location':'Hong Kong S.A.R. / Sha Tin','setupKey':key,'starterMinutes':120})
admin.call('auth/login',{'email':aemail,'password':password})
clients=[]
for n in range(3):
 c=Client();c.email=f'member-{n}-{seed}@example.test';r=c.call('auth/register',{'email':c.email,'password':password,'name':f'Integration member {n}','location':'Hong Kong S.A.R. / Sha Tin',**extra});c.recovery=r['recoveryKey'];c.me=c.call('me');assert c.me['balance']['available']==7200;clients.append(c)
 open('.wrangler/test-login.json','w').write(json.dumps({'email':c.email,'password':password}))
a,b,c=clients
assert a.call('me')['user']['location']=='Hong Kong S.A.R. / Sha Tin'
a.call('me',{'name':'Integration member','location':'invented community',**extra},expected=400)
a.call('me',{'name':'Integration member','location':'Hong Kong S.A.R. / Wan Chai',**extra})
assert a.call('me')['user']['location']=='Hong Kong S.A.R. / Wan Chai'
a.call('auth/logout',{})
a.call('auth/login',{'email':a.email,'password':password})
assert a.call('me')['user']['location']=='Hong Kong S.A.R. / Wan Chai'
a.call('me',{'name':'Integration member','location':'Hong Kong S.A.R. / Sha Tin',**extra})
Client().call('me',expected=401)
a.call('tasks',{},expected=403,origin='https://invalid.example')
a.call('admin',expected=403)
cat=a.me['categories'][0]['id']
def create(client,minutes=15):return client.call('tasks',{'title':'Integration service '+uuid.uuid4().hex[:8],'description':'Only in isolated test database','categoryId':cat,'location':'Hong Kong S.A.R. / Sha Tin','remote':True,'minutes':minutes,'requestedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(time.time()+86400))},expected=201)['id']
tid=create(a);a.call('tasks/'+tid+'/accept',{},expected=400)
assert not any(t['id']==tid for t in a.call('tasks'))
assert any(t['id']==tid for t in b.call('tasks'))
assert a.call('me')['balance']['reserved']==900
with concurrent.futures.ThreadPoolExecutor() as pool:
 result=list(pool.map(lambda x:x.call('tasks/'+tid+'/accept',{},expected=None),[b,c]))
assert sum(r[0]==200 for r in result)==1 and all(r[0] in [200,403,409] for r in result),result
helper=b if result[0][0]==200 else c;other=c if helper is b else b
other.call('tasks/'+tid,expected=403)
other.call('tasks/'+tid+'/message',{'content':'Unauthorized'},expected=403)
helper.call('notifications',{})
assert helper.call('notifications/count')['unread']==0
a.call('tasks/'+tid+'/message',{'content':'A private test message'})
assert helper.call('notifications/count')['unread']==1
notification=helper.call('notifications')[0]
other.call('notifications',{'id':notification['id']},expected=404)
assert helper.call('notifications/count')['unread']==1
helper.call('notifications',{'id':notification['id']})
assert helper.call('notifications/count')['unread']==0
helper.call('notifications',{'id':notification['id']})
assert helper.call('notifications/count')['unread']==0
Client().call('notifications/count',expected=401)

assert helper.call('tasks/'+tid)['messages'][0]['content']=='A private test message'
photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZxoAAAAASUVORK5CYII='
a.call('tasks/'+tid+'/message',{'photo':photo})
assert helper.call('tasks/'+tid)['messages'][-1]['photo']==photo
other.call('tasks/'+tid+'/messages',expected=403)
other.call('tasks/'+tid+'/message',{'photo':photo},expected=403)
a.call('tasks/'+tid+'/message',{'photo':'data:image/svg+xml;base64,PHN2Zy8+'},expected=400)
a.call('tasks/'+tid+'/message',{},expected=400)
for n in range(11):a.call('tasks/'+tid+'/message',{'content':f'Pagination test {n}'})
page=helper.call('tasks/'+tid+'/messages');assert len(page)==10
older=helper.call('tasks/'+tid+'/messages?before='+str(page[-1]['cursor']));assert len(older)==3
assert any(m['photo']==photo for m in older)
a.call('tasks/'+tid+'/start',{},expected=409)
current=a.call('tasks/'+tid)
start_at=int(time.time())+4
from datetime import datetime,timezone
a.call('tasks/'+tid+'/schedule',{'requestedAt':datetime.fromtimestamp(start_at,timezone.utc).isoformat(),'previousDate':current['requested_at']})
a.call('tasks/'+tid+'/agree',{'requestedAt':start_at});helper.call('tasks/'+tid+'/agree',{'requestedAt':start_at})
assert a.call('tasks/'+tid)['started_at'] is None
a.call('tasks/'+tid+'/start',{},expected=409)
time.sleep(max(0,start_at-time.time())+.1)
a.call('tasks/'+tid+'/start',{});assert a.call('tasks/'+tid)['started_at'] is None
helper.call('tasks/'+tid+'/start',{});active=a.call('tasks/'+tid);assert active['started_at'] and active['status']=='in_progress'
a.call('tasks/'+tid+'/start',{},expected=409)
time.sleep(1.1)
helper.call('tasks/'+tid+'/finish',{});done=a.call('tasks/'+tid);amount=done['actual_seconds'];assert amount>=1
helper.call('tasks/'+tid+'/confirm',{},expected=409)
with concurrent.futures.ThreadPoolExecutor() as pool:
 rs=list(pool.map(lambda _:a.call('tasks/'+tid+'/confirm',{},expected=None),range(2)))
assert sorted(r[0] for r in rs)==[200,409],rs
assert a.call('me')['balance']['available']==7200-amount
assert helper.call('me')['balance']['available']==7200+amount
assert a.call('me')['balance']['reserved']==0
entries=a.call('ledger')['entries'];assert len([x for x in entries if x['task_id']==tid and x['type']=='transfer'])==1
assert len([x for x in entries if x['task_id']==tid and x['type']=='release'])==1
a.call('tasks/'+tid+'/review',{'rating':5,'feedback':'Integration feedback'})
a.call('tasks/'+tid+'/review',{'rating':5},expected=409)
other.call('tasks/'+tid+'/review',{'rating':5},expected=403)
assert helper.call('me')['user']['rating']==5
assert len(a.call('notifications'))>=3
a.call('notifications',{});assert all(n['read_at'] for n in a.call('notifications'))
a.call('auth/logout',{});a.call('me',expected=401);a.call('auth/login',{'email':a.email,'password':password});assert a.call('me')['balance']['available']==7200-amount
# Concurrent requests cannot reserve more than the available balance.
with concurrent.futures.ThreadPoolExecutor() as pool:
 def attempt(_):
  try:return create(other,90)
  except AssertionError as e:return None
 race=list(pool.map(attempt,range(2)))
assert sum(bool(x) for x in race)==1,race
assert other.call('me')['balance']['available']==1800
for cancelid in filter(None,race):other.call('tasks/'+cancelid+'/cancel',{'reason':'Integration cancellation'})
assert other.call('me')['balance']['reserved']==0
# Dispute keeps funds held until audited administrator action.
dispute=create(a);helper.call('tasks/'+dispute+'/accept',{});a.call('tasks/'+dispute+'/dispute',{'reason':'Integration disagreement'})
assert a.call('me')['balance']['reserved']==900
admin.call('admin/resolve',{'taskId':dispute,'resolution':'cancel','reason':'Integration dispute resolution'})
assert a.call('me')['balance']['reserved']==0
admin.call('admin/adjust',{'userId':a.me['user']['id'],'seconds':60,'reason':'Integration adjustment'})
assert a.call('me')['balance']['available']==7260-amount
admin.call('admin/settings',{'starterMinutes':0,'reason':'Integration zero-credit policy'})
fresh=Client();fresh.call('auth/register',{'email':'zero-'+seed+'@example.test','password':password,'name':'Integration zero credit','location':'Hong Kong S.A.R. / Sha Tin',**extra});assert fresh.call('me')['balance']['available']==0
denied=fresh.call('tasks',{'title':'No-credit request','description':'Isolated test','categoryId':cat,'location':'Hong Kong S.A.R. / Sha Tin','remote':True,'minutes':60,'requestedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(time.time()+86400))},expected=409)
assert '0h 0m' in denied['error']
assert fresh.call('me')['balance']['available']==0
assert fresh.call('me')['balance']['reserved']==0
assert len(fresh.call('me')['agreements'])==2
assert fresh.call('me')['user']['phone']==extra['phone']
assert 'phone' not in helper.call('profiles/'+fresh.call('me')['user']['id'])
# Recovery rotates key, invalidates old sessions, and persists the ledger.
old=Client();old.cookie=a.cookie
newpass=uuid.uuid4().hex
recovered=a.call('auth/recover',{'email':a.email,'password':newpass,'recoveryKey':a.recovery});assert recovered['recoveryKey']!=a.recovery
old.call('me',expected=401)
a.call('auth/recover',{'email':a.email,'password':password,'recoveryKey':a.recovery},expected=401)
assert a.call('me')['balance']['available']==7260-amount
admin.call('admin/suspend',{'userId':other.me['user']['id'],'suspended':True,'reason':'Integration suspension'})
other.call('me',expected=401)
other.call('auth/login',{'email':other.email,'password':password},expected=403)
assert len(admin.call('admin')['audit'])>=5
print(f'PASS: {checks} HTTP assertions plus ledger, concurrency, privacy, review, persistence, recovery and administration invariants.')
