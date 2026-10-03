"""Owner/privacy/integration checks against isolated synthetic localhost data only."""
import json,urllib.request,urllib.error,hashlib,time,sqlite3,glob,uuid
base='http://127.0.0.1:8789'
count=0
def call(user,path,data=None,status=200,token=None):
 global count
 h={'Origin':base,'Content-Type':'application/json'}
 if token:h['Authorization']='CareDevice '+token
 elif user:h['Cookie']='tb_session='+hashlib.sha256(('isolated-partner-fixture:'+user).encode()).hexdigest()
 req=urllib.request.Request(base+'/api/'+path,headers=h,data=json.dumps(data).encode() if data is not None else None)
 try:r=urllib.request.urlopen(req)
 except urllib.error.HTTPError as e:r=e
 v=json.loads(r.read());assert r.status==status,(path,r.status,status,v);count+=1;return v
call(None,'care',status=401)
call('owner','care',status=403)
assert call('alice','care')['needsSetup']
call('alice','care/setup',{'consent':False},400)
for u in ['alice','bob','reviewer']:call(u,'care/setup',{'consent':True})
body={'kind':'symptom','occurredAt':int(time.time()),'data':{'description':'Synthetic shoulder discomfort','area':'shoulder','notes':'after a walk'},'confirmed':True}
call('alice','care/record',{**body,'confirmed':False},400)
r=call('alice','care/record',body)['id']
assert call('alice','care')['records'][0]['data']['description']==body['data']['description']
assert not call('bob','care')['records'] and not call('reviewer','care')['records']
for who in ['bob','reviewer']:
 call(who,'care/record',{**body,'id':r,'version':1},404)
 call(who,'care/delete-record',{'id':r},404)
call('alice','care/record',{**body,'id':r,'version':1})
call('alice','care/record',{**body,'id':r,'version':1},409)
call('alice','care/record',{'kind':'checkin','occurredAt':int(time.time()),'data':{},'confirmed':True},400)
call('alice','care/record',{'kind':'checkin','occurredAt':int(time.time()),'data':{'energy':'Tired'},'confirmed':True})
s=call('alice','care/summary',{'title':'Appointment test','content':'User observations only','confirmed':True})['id']
call('bob','care/summary',{'id':s,'version':1,'title':'Wrong','content':'Wrong','confirmed':True},404)
call('alice','care/share',{'id':s,'version':1,'email':'owner@partner.test','days':7,'confirmed':True},400)
share=call('alice','care/share',{'id':s,'version':1,'email':'bob@partner.test','days':7,'confirmed':True})['id']
assert call('bob','care/shared?id='+share)['content']=='User observations only'
call('reviewer','care/shared?id='+share,status=404)
call('alice','care/summary',{'id':s,'version':1,'title':'Changed','content':'Not shared automatically','confirmed':True})
assert call('bob','care/shared?id='+share)['content']=='User observations only'
call('bob','care/revoke',{'id':share},404)
expired=call('alice','care/share',{'id':s,'version':2,'email':'bob@partner.test','days':1,'confirmed':True})['id']
c=sqlite3.connect(next(p for p in glob.glob('/tmp/silver-partner-qa-state/v3/d1/miniflare-D1DatabaseObject/*.sqlite') if not p.endswith('metadata.sqlite')))
c.execute('UPDATE care_shares SET expires=? WHERE id=?',(int(time.time())-1,expired));c.commit()
call('bob','care/shared?id='+expired,status=404)
call('alice','care/revoke',{'id':share})
call('bob','care/shared?id='+share,status=404)
d=call('alice','care/connect',{'name':'Synthetic adapter','permissions':['steps']})
assert call('alice','care')['devices'][0]['last_sync'] is None
measurement={'id':'reading-1','kind':'steps','value':123,'unit':'steps','measuredAt':int(time.time())}
call(None,'care-device',{'measurements':[measurement]},401)
call(None,'care-device',{'measurements':[{**measurement,'kind':'heart_rate','unit':'bpm'}]},400,token=d['token'])
assert call(None,'care-device',{'measurements':[measurement]},token=d['token'])['received']==1
assert call(None,'care-device',{'measurements':[measurement]},token=d['token'])['received']==0
assert len(call('alice','care')['measurements'])==1
assert not call('bob','care')['measurements']
rot=call('alice','care/device-permissions',{'id':d['id'],'permissions':['steps']})
call(None,'care-device',{'measurements':[measurement]},401,token=d['token'])
call('alice','care/disconnect',{'id':d['id']})
call(None,'care-device',{'measurements':[measurement]},401,token=rot['token'])
taskid=uuid.uuid4().hex
c.execute("INSERT INTO tasks(id,requester_id,title,description,category_id,location,remote,estimated_seconds,requested_at) VALUES(?,'bob','Synthetic remote help','Synthetic task','category','Hong Kong S.A.R. / Sha Tin',1,1800,?)",(taskid,int(time.time())+86400));c.commit()
assert all(t['id']!=taskid for t in call('alice','recommendations'))
call('alice','care/preferences',{'bankConsent':True,'activity':['remote','shorter'],'notifications':True,'reminderHour':9})
assert call('alice','care')['preferences']['bank_consent']==1
assert any(t['id']==taskid and 'May suit your activity preferences' in t['reasons'] for t in call('alice','recommendations'))
call('alice','care/preferences',{'bankConsent':False,'activity':[],'notifications':False,'reminderHour':''})
assert call('alice','care')['preferences']['bank_consent']==0
assert all(t['id']!=taskid for t in call('alice','recommendations'))
p=call('bob','profiles/alice');assert all(k not in p for k in ['records','measurements','symptoms','care'])
call('alice','care/erase',{'confirmation':'no'},400)
call('alice','care/erase',{'confirmation':'DELETE MY CARE DATA'})
assert call('alice','care')['needsSetup']
assert call('alice','me')['user']['id']=='alice'
assert not call('bob','care')['received']
print(f'PASS: {count} Silver Care API privacy, record, sharing, device and deletion checks')
