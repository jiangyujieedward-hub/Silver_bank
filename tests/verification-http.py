"""Run only against the isolated ngo-review-test server on 127.0.0.1:8789."""
import urllib.request,urllib.error,json,uuid,datetime
BASE='http://127.0.0.1:8789';count=0
class Client:
 def __init__(self):self.cookie=''
 def call(self,path,data=None,status=200):
  global count
  headers={'Origin':BASE,'Content-Type':'application/json','Cookie':self.cookie}
  request=urllib.request.Request(BASE+'/api/'+path,headers=headers,data=json.dumps(data).encode() if data is not None else None)
  try:r=urllib.request.urlopen(request)
  except urllib.error.HTTPError as e:r=e
  value=json.loads(r.read());assert r.status==status,(path,r.status,value,status)
  if r.headers.get('Set-Cookie'):self.cookie=r.headers['Set-Cookie'].split(';')[0]
  count+=1;return value
s=uuid.uuid4().hex;password=s+'!';public=Client();policy=public.call('policies');assert policy['minimumAge']==14
consent={'signature':'Synthetic test','signatureDrawing':'[[[100,100],[200,50],[350,170]]]',**{p['kind']+'Agreed':True for p in policy['policies']},**{p['kind']+'Version':p['version'] for p in policy['policies']}}
key='verification-test-setup'
admin=Client();admin.call('setup',{'email':s+'-admin@example.test','name':'Test reviewer','password':password,'location':'Hong Kong S.A.R. / Sha Tin','setupKey':key,'starterMinutes':180});admin.call('auth/login',{'email':s+'-admin@example.test','password':password})
base={'password':password,'location':'Hong Kong S.A.R. / Sha Tin','phone':'+85212345678','language':'en',**consent}
def register(n,**extra):
 c=Client();c.call('auth/register',{**base,'accountType':'individual','birthDate':'1990-01-01','name':'Test '+n,'email':s+'-'+n+'@example.test',**extra});c.me=c.call('me');return c
public.call('auth/register',{**base,'name':'Underage','email':s+'-young@example.test','accountType':'individual','birthDate':datetime.date.today().isoformat()},400)
a=register('a');b=register('b');assert a.me['balance']['total']==0 and not a.me['verification']['canParticipate']
a.call('tasks',{},403);a.call('verification/review-queue',status=403)
aid=a.me['user']['id'];bid=b.me['user']['id']
def review(user,status='under_review',**extra):
 v=next(x for x in admin.call('verification/review-queue')['individuals'] if x['user_id']==user)
 return admin.call('verification/review',{'userId':user,'version':v['version'],'status':status,'reason':'Synthetic evidence reviewed',**extra})
review(aid)
checks={'ageChecked':True,'identityChecked':True,'duplicateChecked':True,'identityIssuer':'TEST-ISSUER','identityIdentifier':'test-unique-'+s,'evidenceReference':'Synthetic original evidence reference'}
review(aid,'verified',**checks);assert a.call('me')['balance']['total']==10800
review(bid);assert review(bid,'verified',**checks)['reviewRequired'];assert b.call('me')['balance']['total']==0
v=public.call('policies');assert 'birth_date' not in a.call('profiles/'+aid)
review(aid);review(aid,'verified',**checks);assert a.call('me')['balance']['total']==10800
orgFields={'legalName':'Synthetic NGO','publicName':'Test Partner','jurisdiction':'TEST-JURISDICTION','entityType':'Association','registrationId':s,'registeredAddress':'Synthetic test address','website':'https://example.org','contactEmail':'test@example.org','contactPhone':'+85212345678','mission':'Synthetic community activity','representativeName':'Test Rep','representativeRole':'Director','representativeEmail':'test@example.org'}
ngo=register('ngo',accountType='organization',**orgFields);oid=ngo.me['verification']['organizations'][0]['id'];assert ngo.me['balance']['total']==0
b.call('verification/organization?organizationId='+oid,status=403)
ngo.call('verification/invite',{'organizationId':oid,'email':s+'-a@example.test','role':'staff'},403)
admin.call('verification/jurisdiction',{'jurisdiction':'TEST-JURISDICTION','identifierLabel':'Association register ID','documents':'Original registration and representative authorization','activityRequired':True,'reason':'Synthetic jurisdiction policy'})
def orgreview(status,**checks):
 o=next(o for o in admin.call('verification/review-queue')['organizations'] if o['id']==oid)
 return admin.call('verification/review',{'organizationId':oid,'version':o['version'],'status':status,'reason':'Synthetic NGO review',**checks})
orgreview('under_review');orgreview('verified',registryChecked=True,representativeChecked=True,activityChecked=True,evidenceReference='Registry citation and representative authorization')
orgview=ngo.call('verification/organization?organizationId='+oid);assert orgview['capabilities']['verified'];assert 'evidence_reference' not in orgview['organization'];assert ngo.call('me')['verification']['canParticipate'];ngo.call('tasks',{},400)
token=ngo.call('verification/invite',{'organizationId':oid,'email':s+'-a@example.test','role':'staff'})['inviteToken']
b.call('verification/accept-invite',{'token':token},403);a.call('verification/accept-invite',{'token':token})
a.call('verification/invite',{'organizationId':oid,'email':'outsider@example.test','role':'staff'},403)
assert not a.call('verification/organization?organizationId='+oid)['capabilities']['manageStaff']
ngo.call('verification/message',{'organizationId':oid,'content':'Synthetic private message'})
b.call('verification/organization?organizationId='+oid,status=403)
ngo.call('verification/organization',{**orgFields,'organizationId':oid,'version':2})
assert not a.call('verification/organization?organizationId='+oid)['capabilities']['verified'];ngo.call('tasks',{},403);ngo.call('tasks');ngo.call('ledger')
assert a.call('me')['balance']['total']==10800
print(f'PASS: {count} HTTP checks: age rejection, pending credit/permissions, manual approval, duplicates, private data, organization checks, invitations, staff roles, material-change re-review.')
