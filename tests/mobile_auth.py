"""Native bearer auth and onboarding upgrade against the isolated local Worker only."""
import json,urllib.request,urllib.error,uuid,pathlib
BASE='http://127.0.0.1:8787';token='';count=0
def call(path,data=None,status=200,origin='capacitor://localhost'):
 global token,count
 headers={'Content-Type':'application/json','X-Timebank-Client':'native','Origin':origin}
 if token:headers['Authorization']='Bearer '+token
 request=urllib.request.Request(BASE+'/api/'+path,headers=headers,data=None if data is None else json.dumps(data).encode())
 try:r=urllib.request.urlopen(request)
 except urllib.error.HTTPError as e:r=e
 body=json.loads(r.read());assert r.status==status,(r.status,body,status);count+=1
 assert r.headers.get('Access-Control-Allow-Origin')==origin
 if body.get('sessionToken') if isinstance(body,dict) else False:
  assert not r.headers.get('Set-Cookie');token=body['sessionToken']
 return body
policies=call('policies')['policies'];email=uuid.uuid4().hex+'@example.test';password=uuid.uuid4().hex
info={'email':email,'password':password,'name':'Native integration participant','location':'Test area','countryCode':'+852','phoneNumber':'12345678','role':'admin','language':'ja','ageBand':'75plus','signatureDrawing':'[[[100,100],[200,50],[350,170]]]', 'signature':'Native integration participant',**{p['kind']+'Agreed':True for p in policies},**{p['kind']+'Version':p['version'] for p in policies}}
call('auth/register',{**info,'signatureDrawing':''},428)
call('auth/register',{**info,'countryCode':'+000'},400)
call('auth/register',{**info,'privateAgreed':False},428)
call('auth/register',{**info,'communityVersion':'outdated'},428)
call('auth/register',info);me=call('me');assert not me['needsOnboarding'] and len(me['agreements'])==2
assert me['user']['role']=='member'
assert all(a['signature_drawing']==info['signatureDrawing'] for a in me['agreements'])
call('admin',status=403)
assert me['user']['language']=='ja' and me['user']['age_band']=='75plus'
call('me',{**info,'language':'fr','countryCode':'+33','phoneNumber':'123456789','location':'Updated test area'})
old=token;call('auth/logout',{});call('me',status=401);token=''
call('auth/login',{'email':email,'password':password});saved=call('me')['user'];assert saved['phone']=='+33123456789' and saved['language']=='fr' and saved['location']=='Updated test area'
# Earlier token remains revoked after a new sign-in.
current=token;token=old;call('me',status=401);token=current
assert 'phone' not in call('profiles/'+saved['id'])
print(f'PASS: {count} native HTTP checks, secure-token transport, revocation, consent validation and persistent profile edits.')
