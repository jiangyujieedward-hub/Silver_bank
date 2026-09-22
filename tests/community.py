"""Local-only integration: original workflow plus community support authorization and persistence."""
import runpy,time,uuid,concurrent.futures,os
s=runpy.run_path('tests/workflow.py');a=s['a'];helper=s['helper'];admin=s['admin'];Client=s['Client'];cat=s['cat'];create=s['create'];checks=0
def check(condition):
 global checks
 assert condition
 checks+=1
Client().call('recommendations',expected=401)
a.call('community-insights',expected=403)
a.call('community-insights/settings',{'enabled':True,'reason':'not allowed'},expected=403)
a.call('matching-preferences',{'mode':'invalid','days':[],'timezone':'UTC'},expected=400)
a.call('matching-preferences',{'mode':'remote','days':['Invalid'],'timezone':'UTC'},expected=400)
a.call('matching-preferences',{'mode':'remote','days':['Mon'],'timezone':'invalid'},expected=400)
a.call('matching-preferences',{'mode':'remote','days':['Mon','Mon'],'timezone':'Asia/Hong_Kong','maxMinutes':120,'userId':helper.me['user']['id']})
p=a.call('matching-preferences');check(p['days']=='["Mon"]' and p['timezone']=='Asia/Hong_Kong' and p['max_minutes']==120)
check(helper.call('matching-preferences')['mode']=='any')
tid=create(helper)
r=a.call('recommendations');check(any(t['id']==tid for t in r));check(all(t['requester_id']!=a.me['user']['id'] and 'score' not in t and t['reasons'] for t in r))
# Turning off external processing leaves every normal workflow available.
settings={'enabled':False,'dailyCalls':20,'repeatCount':5,'rapidSeconds':60,'reason':'Isolated feature test'}
admin.call('community-insights/settings',settings)
check(a.call('request-support',{'text':'test','consent':True})=={'available':False,'draft':None})
create(a)
admin.call('community-insights/settings',{**settings,'enabled':True})
a.call('request-support',{'text':'Test','consent':False},expected=400)
a.call('request-support',{'text':'Test','consent':True,'timezone':'invalid'},expected=400)
# One synthetic provider call only; this test never sends member details.
if os.environ.get('TEST_GROQ')=='1':
 before=len(a.call('tasks?view=requested'))
 result=a.call('request-support',{'text':'I need someone to water my plants for 30 minutes.','consent':True,'timezone':'Asia/Hong_Kong'})
 check(result['available']);d=result['draft'];check(d['minutes']==30 and d['location'] is None and d['requestedAt'] is None)
 check(len(a.call('tasks?view=requested'))==before)
 with concurrent.futures.ThreadPoolExecutor() as pool:
  results=list(pool.map(lambda _:a.call('request-support',{'text':'Do not send a second call','consent':True}),range(4)))
 check(all(x['available']==False for x in results))
# Deterministic review flags: duplicate title evidence; no automatic penalty.
name='Isolated duplicate request '+uuid.uuid4().hex
for _ in range(3):a.call('tasks',{'title':name,'description':'Test only','categoryId':cat,'location':'Test community','remote':True,'minutes':1,'requestedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(time.time()+86400))},expected=201)
ins=admin.call('community-insights');flags=[f for f in ins['flags'] if f['rule']=='Repeated request titles'];check(len(flags)>0)
f=next(f for f in flags if name.lower() in f['subject'])
check(a.call('me')['user']['suspended']==0)
admin.call('community-insights/flag',{'flagId':f['id'],'status':'dismissed','reason':'Legitimate recurring requests in isolated test'})
check(next(x for x in admin.call('community-insights')['flags'] if x['id']==f['id'])['status']=='dismissed')
# Dispute summary is admin only, read only, grounded in records.
tid=create(a);helper.call('tasks/'+tid+'/accept',{});a.call('tasks/'+tid+'/message',{'content':'Participant statement for test'});a.call('tasks/'+tid+'/dispute',{'reason':'Test concern'})
a.call('dispute-summary/'+tid,expected=403)
before=a.call('me')['balance'];case=admin.call('dispute-summary/'+tid)
check(case['unresolved']=='Test concern' and case['statements'][0]['content']=='Participant statement for test')
check([e['status'] for e in case['events']]==['open','accepted','disputed'])
check(case['ledger'][0]['type']=='reserve' and a.call('me')['balance']==before)
check(any(x['action']=='view_dispute_summary' for x in admin.call('admin')['audit']))
admin.call('community-insights/settings',{**settings,'dailyCalls':0,'enabled':True})
check(a.call('request-support',{'text':'Test','consent':True})['available']==False)
print('PASS:',checks,'community invariants plus endpoint authorization and validation checks.')
