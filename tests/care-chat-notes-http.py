"""Synthetic local-only live AI extraction checks. Respects provider spacing."""
import json,urllib.request,urllib.error,hashlib,time,uuid
base='http://127.0.0.1:8789'
def call(user,path,data=None,status=200):
 h={'Origin':base,'Content-Type':'application/json'}
 if user:h['Cookie']='tb_session='+hashlib.sha256(('isolated-partner-fixture:'+user).encode()).hexdigest()
 req=urllib.request.Request(base+'/api/'+path,headers=h,data=json.dumps(data).encode() if data is not None else None)
 try:r=urllib.request.urlopen(req,timeout=40)
 except urllib.error.HTTPError as e:r=e
 v=json.load(r);assert r.status==status,(path,r.status,v);return v
body={'consent':True,'autoSavePhysical':True,'requestId':str(uuid.uuid4()),'messages':[{'role':'user','content':'My left knee hurts when I walk. It started this morning.'}]}
call(None,'care/chat',body,status=401)
call('alice','care/chat',{**body,'consent':False},400)
call('alice','care/chat',{**body,'requestId':'invalid'},400)
r=call('alice','care/chat',body);assert r['record'] and not r['recordError'],r
records=call('alice','care')['records'];assert any(x['id']==r['record']['id'] for x in records)
assert all(x['id']!=r['record']['id'] for x in call('bob','care')['records'])
assert all(q in body['messages'][0]['content'] for q in r['record']['description'].split('\n\n'))
print('PASS: real AI physical quote saved privately',flush=True)
time.sleep(31)
r=call('alice','care/chat',{**body,'requestId':str(uuid.uuid4()),'messages':[{'role':'user','content':'I feel lonely because I miss my friends. I would like to talk.'}]});assert r['record'] is None and not r['recordError'],r
print('PASS: emotional-only conversation does not create a physical note',flush=True)
time.sleep(31)
r=call('alice','care/chat',{**body,'requestId':str(uuid.uuid4()),'messages':[{'role':'user','content':'I feel anxious about tomorrow. My right shoulder hurts when I lift my arm.'}]});assert r['record'] and 'anxious' not in r['record']['description'].lower(),r
print('PASS: mixed conversation saves only the physical quotation',flush=True)
time.sleep(31)
r=call('alice','care/chat',{**body,'autoSavePhysical':False,'requestId':str(uuid.uuid4())});assert r['record'] is None,r
print('PASS: automatic-note opt-out honored',flush=True)
