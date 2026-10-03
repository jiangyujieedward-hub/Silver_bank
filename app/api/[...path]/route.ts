import {careRoute,ingestCare} from '@/lib/care';
import {partnerRoute,programsRoute,taskPreparation} from '@/lib/partners';
import {verificationRoute,verificationSummary,verificationPolicy,dateOfBirth,ageBandFromBirth,oldEnough,createOrganization,requireParticipation} from '@/lib/verification';
import {communityRoute,scanFlags} from '@/lib/community';
import {validatePhoto} from '@/lib/photo';
import {policies,languages,ageBands,details,acceptance,needsOnboarding} from '@/lib/onboarding';
import { env } from 'cloudflare:workers';
import {database,uid,query,one,rows,run,fail,clean,required,whole,hash,secret,password,equal,actor,rate,profile,balance,taskSelect,task,participant,admin,money} from '@/lib/bank';
import {validCommunity} from '@/lib/communities';
function communityLocation(b:any){const value=required(b.location,200);if(!validCommunity(value))fail('Choose your country, region and community.');return value;}
export const dynamic='force-dynamic';
const reply=(value:any,status=200,headers:any={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
async function handler(req:Request) {try{
 const parts=new URL(req.url).pathname.replace(/^\/api\//,'').split('/');const [root,id,action]=parts;const url=new URL(req.url);const post=req.method==='POST';const native=req.headers.get('X-Timebank-Client')==='native'&&!req.headers.get('cookie');
 if(post){const origin=req.headers.get('origin');if(origin!==url.origin&&!native&&root!=='care-device')fail('Please submit this form from the application.',403);if(!req.headers.get('content-type')?.includes('application/json'))fail('Unsupported request.',415);if(Number(req.headers.get('content-length')||0)>1500000)fail('File is too large.',413);}
 const raw=post?await req.text():'';if(raw.length>1500000)fail('Request is too large.',413);let b:any={};if(post){try{b=JSON.parse(raw)}catch{fail('Invalid request body.')}}
 if(!b||typeof b!=='object'||Array.isArray(b))fail('Invalid request body.');
 if(root==='policies'&&!post)return reply({policies,languages,ageBands,...await verificationPolicy()});
 if(root==='auth'){
  if(id==='logout'){if(!post)fail('Method not allowed.',405);const u=await actor(req);const token=req.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1] || req.headers.get('cookie')?.match(/(?:^|;\s*)tb_session=([^;]+)/)?.[1];await run('DELETE FROM sessions WHERE id=? AND user_id=?',await hash(token!),u.id);return reply({ok:true},200,{'Set-Cookie':`tb_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${url.protocol==='https:'?'; Secure':''}`});}
  if(!post)fail('Method not allowed.',405);
  await rate(req,id);const email=required(b.email,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid email address.');const pass=required(b.password,256);if(pass.length<12)fail('Use a password with at least 12 characters.');
  let u:any;let recoveryKey:string|undefined;
  if(id==='register'){
   const configured=await one("SELECT value FROM settings WHERE id='configured'");if(!configured)fail('The community administrator must finish setup before registration opens.',503);
   const accountType=b.accountType;if(!['individual','organization'].includes(accountType))fail('Choose Individual or Community Partner registration.');const policy=await verificationPolicy();const dob=accountType==='individual'?dateOfBirth(b.birthDate):null;if(dob&&!oldEnough(dob,policy.minimumAge))fail(`You must be at least ${policy.minimumAge} to participate.`);const extra=details({...b,ageBand:dob?ageBandFromBirth(dob):''},accountType==='organization');const userId=uid();const consents=acceptance(b,userId);recoveryKey=secret();const pw=await password(pass);const rec=await hash(recoveryKey);
   try{await database().batch([query('INSERT INTO users(id,email,name,password,recovery,location,phone,language,age_band,account_type) VALUES(?,?,?,?,?,?,?,?,?,?)',userId,email,required(b.name,100),pw,rec,communityLocation(b),extra.phone,extra.language,extra.ageBand,accountType),...consents,...(accountType==='organization'?createOrganization(b,userId):[query("INSERT INTO identity_verifications(user_id,legal_name,birth_date,status) VALUES(?,?,?,'submitted')",userId,required(b.name,100),dob)])]);}catch(e:any){if(String(e).includes('UNIQUE'))fail('An account or organization with these details already exists. Sign in, recover your account or contact verification staff.');throw e;}
   u=await one('SELECT * FROM users WHERE id=?',userId);
  }else if(id==='login'){
   u=await one('SELECT * FROM users WHERE email=?',email);const expected=await password(pass,u?.password.split(':')[0]||'invalid-account');if(!u||!equal(expected,u.password))fail('Email or password is incorrect.',401);
  }else if(id==='recover'){
   u=await one('SELECT * FROM users WHERE email=?',email);if(!u||!equal(await hash(required(b.recoveryKey,100)),u.recovery))fail('Email or recovery key is incorrect.',401);
   recoveryKey=secret();await database().batch([query('UPDATE users SET password=?,recovery=? WHERE id=?',await password(pass),await hash(recoveryKey),u.id),query('DELETE FROM sessions WHERE user_id=?',u.id)]);
  }else fail('Not found.',404);
  if(u.suspended)fail('This account is suspended.',403);const token=secret();await run('INSERT INTO sessions(id,user_id,expires) VALUES(?,?,unixepoch()+604800)',await hash(token),u.id);if(native)return reply({ok:true,recoveryKey,sessionToken:token});return reply({ok:true,recoveryKey},200,{'Set-Cookie':`tb_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${url.protocol==='https:'?'; Secure':''}`});
 }
 if(root==='setup'){
  if(!post)return reply({configured:!!await one("SELECT id FROM settings WHERE id='configured'")});
  await rate(req,'setup',5);if(await one("SELECT id FROM settings WHERE id='configured'"))fail('Setup is already complete.',409);
  const key=(env as any).ADMIN_SETUP_KEY;if(!key||!equal(String(b.setupKey||''),key))fail('A valid administrator setup key is required.',403);
  const email=required(b.email,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid email.');const pass=required(b.password,256);if(pass.length<12)fail('Use at least 12 characters.');const adminId=uid(),rec=secret();
  const cats=['Shopping and errands','Parcel collection','Pet care','Plant care','Technology assistance','Household help','Language practice','Teaching and skills exchange','Companionship','Community assistance','Other'];
  await database().batch([query("INSERT INTO settings(id,value) VALUES('configured','1')"),query("INSERT INTO settings(id,value) VALUES('onboarding_seconds',?)",String(whole(b.starterMinutes,0,525600)*60)),query("INSERT INTO users(id,email,name,password,recovery,location,role) VALUES(?,?,?,?,?,?,'admin')",adminId,email,required(b.name,100),await password(pass),await hash(rec),communityLocation(b)),...cats.map(name=>query('INSERT INTO categories(id,name) VALUES(?,?)',uid(),name)),query("INSERT INTO admin_actions(id,actor_id,action,target_id,reason) VALUES(?,?,'initialize','settings','Initial community configuration')",uid(),adminId)]);
  return reply({ok:true,recoveryKey:rec});
 }
 if(root==='care-device'){if(!post)fail('Method not allowed.',405);await rate(req,'care-device',120);return reply(await ingestCare(req,b));}
 const u=await actor(req);
 if(root==='care')return reply(await careRoute(u,id,post?b:Object.fromEntries(url.searchParams),post));
 if(root==='partner')return reply(await partnerRoute(u,id,post?b:Object.fromEntries(url.searchParams),post));
 if(root==='programs')return reply(await programsRoute(u,id,post?b:Object.fromEntries(url.searchParams),post));
 if(root==='verification')return reply(await verificationRoute(u,id,post?b:Object.fromEntries(url.searchParams),post));
 if(['recommendations','request-support','matching-preferences','community-insights','dispute-summary'].includes(root))return reply(await communityRoute(root,id,u,b,post));
 if(root==='me'){
  if(post){const extra=details(b,u.account_type==='organization');let image=clean(b.image,1400000)||null;if(image&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image))fail('Choose a PNG, JPEG or WebP image.');const consents=await needsOnboarding(u)?acceptance(b,u.id):[];await database().batch([query('UPDATE users SET name=?,location=?,phone=?,language=?,age_band=?,skills=?,preferences=?,image=? WHERE id=?',required(b.name,100),communityLocation(b),extra.phone,extra.language,extra.ageBand,clean(b.skills,1000),clean(b.preferences,1000),image,u.id),...consents]);}
  const current=await one('SELECT * FROM users WHERE id=?',u.id);return reply({user:await profile(u.id,true),verification:await verificationSummary(current),needsOnboarding:await needsOnboarding(current),agreements:await rows('SELECT kind,version,signature,signature_drawing,accepted_at,task_id FROM agreement_acceptances WHERE user_id=? ORDER BY accepted_at DESC',u.id),balance:await balance(u.id),categories:await rows('SELECT * FROM categories WHERE active=1 ORDER BY name'),serverTime:Math.floor(Date.now()/1000)});
 }
 if(root==='profiles'&&!post)return reply(await profile(id));
 if(root==='tasks'){
  if(post&&(!id||action==='accept'))await requireParticipation(u);
  if(post&&await needsOnboarding(u))fail('Complete your profile and agree to the guidelines before participating.',428);
  if(!id){
   if(post){const seconds=whole(b.minutes,1,10080)*60;const account=await balance(u.id);if(seconds>account.available)fail(`You have ${money(account.available)} available. This request needs ${money(seconds)}. Give time to earn more credit.`,409);const date=Math.floor(Date.parse(required(b.requestedAt))/1000);if(!Number.isFinite(date)||date<=Math.floor(Date.now()/1000))fail('Choose a future date and time.');if(!await one('SELECT id FROM categories WHERE id=? AND active=1',b.categoryId))fail('Choose an available category.');const tid=uid();await run('INSERT INTO tasks(id,requester_id,title,description,category_id,location,remote,estimated_seconds,requested_at) VALUES(?,?,?,?,?,?,?,?,?)',tid,u.id,required(b.title,160),required(b.description,5000),b.categoryId,communityLocation(b),b.remote?1:0,seconds,date);return reply({id:tid},201);}
   let where=" WHERE t.status='open' AND t.requester_id<>? AND r.suspended=0";const args:any[]=[u.id];const view=url.searchParams.get('view');if(view==='helping'){where=' WHERE t.helper_id=?';}if(view==='requested'){where=' WHERE t.requester_id=?';}
   for(const [key,sql] of [['category','t.category_id=?'],['mode','t.remote=?'],['location',"LOWER(t.location) LIKE ?"]]){const v=url.searchParams.get(key);if(v){if(key==='location'&&validCommunity(v)){where+=" AND (LOWER(t.location)=? OR (instr(t.location,' / ')=0 AND LOWER(t.location)=?))";args.push(v.toLowerCase(),v.split(' / ').at(-1)!.toLowerCase());continue;}where+=' AND '+sql;args.push(key==='mode'?(v==='remote'?1:0):key==='location'?'%'+v.toLowerCase()+'%':v);}}
   const max=url.searchParams.get('maxMinutes');if(max){where+=' AND t.estimated_seconds<=?';args.push(whole(max,1,10080)*60);}const date=url.searchParams.get('date');if(date){where+=" AND date(t.requested_at,'unixepoch')=?";args.push(date);}
   return reply(await rows(taskSelect+where+' ORDER BY t.created_at DESC LIMIT 200',...args));
  }
  if(action==='inquiries'){
   const request=await one('SELECT * FROM tasks WHERE id=?',id);if(!request)fail('Task not found.',404);
   if(!post&&u.id===request.requester_id&&!url.searchParams.get('visitor'))return reply(await rows('SELECT m.visitor_id,u.name,MAX(m.created_at) AS updated_at FROM task_inquiry_messages m JOIN users u ON u.id=m.visitor_id WHERE m.task_id=? GROUP BY m.visitor_id ORDER BY updated_at DESC',id));
   const visitor=u.id===request.requester_id?required(post?b.visitor:url.searchParams.get('visitor'),100):u.id;
   if(visitor===request.requester_id)fail('You cannot contact yourself.',400);
   const existing=await one('SELECT id FROM task_inquiry_messages WHERE task_id=? AND visitor_id=? LIMIT 1',id,visitor);
   if(u.id===request.requester_id&&!existing&&request.helper_id!==visitor)fail('Conversation not found.',404);
   if(request.status!=='open'&&request.helper_id!==visitor&&!existing)fail('This task is private to its participants.',403);
   if(post){
    if(request.status!=='open'&&request.helper_id!==visitor)fail('This request is no longer available.',409);
    const content=clean(b.content,4000);let photo=null;try{photo=validatePhoto(b.photo)}catch(e:any){fail(e.message)}if(!content&&!photo)fail('Write a message or choose a photo.');
    await run('INSERT INTO task_inquiry_messages(id,task_id,visitor_id,sender_id,content,photo) VALUES(?,?,?,?,?,?)',uid(),id,visitor,u.id,content,photo);
   }
   return reply(await rows('SELECT m.rowid AS cursor,m.*,u.name AS sender_name FROM task_inquiry_messages m JOIN users u ON u.id=m.sender_id WHERE m.task_id=? AND m.visitor_id=? AND m.rowid<? ORDER BY m.rowid DESC LIMIT 10',id,visitor,url.searchParams.get('before')?whole(url.searchParams.get('before'),1,Number.MAX_SAFE_INTEGER):Number.MAX_SAFE_INTEGER));
  }
  const t=await task(id,u);
  if(!post&&action==='messages'){participant(t,u);const before=url.searchParams.get('before');return reply(await rows('SELECT m.rowid AS cursor,m.*,u.name AS sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE task_id=? AND m.rowid<? ORDER BY m.rowid DESC LIMIT 10',id,before?whole(before,1,Number.MAX_SAFE_INTEGER):Number.MAX_SAFE_INTEGER));}
  if(!post)return reply({...t,preparation:await taskPreparation(t.id,u.id),serverTime:Math.floor(Date.now()/1000),reviews:await rows('SELECT * FROM reviews WHERE task_id=?',id),messages:(u.id===t.requester_id||u.id===t.helper_id)?(await rows('SELECT m.rowid AS cursor,m.*,u.name AS sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE task_id=? ORDER BY m.rowid DESC LIMIT 10',id)).reverse():[]});
  if(action==='accept'){
   if(u.account_type!=='individual')fail('Community Partner accounts organize activities. Use an individual account to participate.',403);
   const prep=await taskPreparation(t.id,u.id);if(prep&&!prep.badge_id)fail('Training required to participate. Open the training from this task.',403);
   const match=await one('SELECT sharer_id FROM partner_matches WHERE task_id=?',t.id);if(match&&match.sharer_id!==u.id)fail('This exchange is reserved for its matched skill sharer.',403);
   if(t.requester_id===u.id)fail('You cannot accept your own request.');const result=await run("UPDATE tasks SET helper_id=?,status='accepted' WHERE id=? AND status='open' AND helper_id IS NULL AND requester_id<>? AND NOT EXISTS(SELECT 1 FROM users WHERE id=tasks.requester_id AND suspended=1)",u.id,id,u.id);if(!result.meta.changes)fail('This request is no longer available.',409);return reply({ok:true});
  }
  participant(t,u);
  if(action==='agree'){
   const col=u.id===t.requester_id?'requester_agreed':'helper_agreed';
   const result=await run(`UPDATE tasks SET ${col}=1 WHERE id=? AND status='accepted' AND requested_at=? AND ${col}=0`,id,whole(b.requestedAt,1,Number.MAX_SAFE_INTEGER));
   if(!result.meta.changes)fail('The date changed or your agreement is already saved. Refresh the task.',409);
  }else if(action==='schedule'){
   if(u.id!==t.requester_id)fail('Only the requester can change the requested date.',403);
   const date=Math.floor(Date.parse(required(b.requestedAt))/1000);
   if(!Number.isFinite(date)||date<=Math.floor(Date.now()/1000))fail('Choose a future date and time.');
   const result=await run("UPDATE tasks SET requested_at=?,requester_agreed=0,helper_agreed=0,requester_ready=0,helper_ready=0 WHERE id=? AND status='accepted' AND requested_at=?",date,id,whole(b.previousDate,1,Number.MAX_SAFE_INTEGER));
   if(!result.meta.changes)fail('The date changed or this task has already started. Refresh the task.',409);
  }else if(action==='start'){
   if(t.requested_at>Math.floor(Date.now()/1000))fail('This task cannot start before the agreed time.',409);
   if(!t.requester_agreed||!t.helper_agreed)fail('Both participants must confirm the date first.',409);
   const col=u.id===t.requester_id?'requester_ready':'helper_ready';const other=u.id===t.requester_id?'helper_ready':'requester_ready';if(t.status!=='accepted'||t[col])fail('Your start confirmation is already saved or this task cannot start.',409);const r=await run(`UPDATE tasks SET ${col}=1,status=CASE WHEN ${other}=1 THEN 'in_progress' ELSE status END,started_at=CASE WHEN ${other}=1 THEN unixepoch() ELSE NULL END WHERE id=? AND status='accepted' AND ${col}=0 AND requester_agreed=1 AND helper_agreed=1 AND requested_at<=unixepoch()`,id);if(!r.meta.changes)fail('Your start confirmation is already saved or this task cannot start.',409);
  }else if(action==='finish'){
   const r=await run("UPDATE tasks SET status='awaiting_confirmation',finished_at=unixepoch(),actual_seconds=MAX(1,unixepoch()-started_at),finished_by=? WHERE id=? AND status='in_progress'",u.id,id);if(!r.meta.changes)fail('This task is no longer in progress.',409);
  }else if(action==='confirm'){
   const r=await run("UPDATE tasks SET status='completed',confirmed_by=?,confirmed_at=unixepoch() WHERE id=? AND status='awaiting_confirmation' AND finished_by<>?",u.id,id,u.id);if(!r.meta.changes)fail('Only the other participant can confirm an unfinished settlement.',409);
  }else if(action==='cancel'){
   if(t.requester_id!==u.id)fail('Only the requester can cancel before a task begins.',403);const r=await run("UPDATE tasks SET status='cancelled',problem=? WHERE id=? AND status IN ('open','accepted')",required(b.reason,2000),id);if(!r.meta.changes)fail('A started task must be reported as a dispute.',409);
  }else if(action==='dispute'){
   const r=await run("UPDATE tasks SET status='disputed',problem=? WHERE id=? AND status IN ('accepted','in_progress','awaiting_confirmation')",required(b.reason,2000),id);if(!r.meta.changes)fail('This task cannot be disputed at its current stage.',409);
  }else if(action==='message'){
   if(!t.helper_id)fail('Messages open after a helper accepts.');const content=clean(b.content,4000);let photo:string|null=null;try{photo=validatePhoto(b.photo)}catch(e:any){fail(e.message)}if(!content&&!photo)fail('Write a message or choose a photo.');await run('INSERT INTO messages(id,task_id,sender_id,content,photo) VALUES(?,?,?,?,?)',uid(),id,u.id,content,photo);
  }else if(action==='review'){
   if(t.status!=='completed')fail('Reviews are available after completion.');await run('INSERT INTO reviews(id,task_id,author_id,recipient_id,rating,feedback) VALUES(?,?,?,?,?,?)',uid(),id,u.id,u.id===t.requester_id?t.helper_id:t.requester_id,whole(b.rating,1,5),clean(b.feedback,2000));
  }else fail('Unknown action.',404);
  return reply({ok:true});
 }
 if(root==='ledger'&&!post)return reply({balance:await balance(u.id),entries:await rows('SELECT l.*,t.title,s.name AS source_name,d.name AS destination_name FROM ledger l LEFT JOIN tasks t ON t.id=l.task_id LEFT JOIN users s ON s.id=l.source_id LEFT JOIN users d ON d.id=l.destination_id WHERE source_id=? OR destination_id=? ORDER BY l.created_at DESC,l.rowid DESC LIMIT 500 OFFSET ?',u.id,u.id,whole(url.searchParams.get('offset')||0,0,1000000))});
 if(root==='notifications'){
  // Durable, idempotent reminders are delivered during the existing notification poll.
  await run("INSERT OR IGNORE INTO notifications(id,user_id,task_id,text) SELECT 'reminder:'||id||':'||requested_at||':'||?, ?,id,title||': It is time for your task. Open the task and confirm Start now when you meet.' FROM tasks WHERE status='accepted' AND requester_agreed=1 AND helper_agreed=1 AND requested_at<=unixepoch() AND (requester_id=? OR helper_id=?)",u.id,u.id,u.id,u.id);
  if(id==='count'&&!post)return reply({unread:(await one('SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND read_at IS NULL',u.id)).n});
  if(id)fail('Not found.',404);
  if(post){if(b.id!==undefined){const nid=required(b.id,100);if(!await one('SELECT id FROM notifications WHERE id=? AND user_id=?',nid,u.id))fail('Not found.',404);await run('UPDATE notifications SET read_at=unixepoch() WHERE id=? AND user_id=? AND read_at IS NULL',nid,u.id);}else await run('UPDATE notifications SET read_at=unixepoch() WHERE user_id=? AND read_at IS NULL',u.id);}
  return reply(await rows('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 200',u.id));
 }
 if(root==='admin'){
  admin(u);
  if(!post)return reply({users:await rows('SELECT u.id,u.name,u.email,u.role,u.suspended,b.* FROM users u JOIN balances b ON b.user_id=u.id ORDER BY u.created_at DESC LIMIT 500'),tasks:await rows(taskSelect+' ORDER BY t.created_at DESC LIMIT 500'),ledger:await rows('SELECT * FROM ledger ORDER BY created_at DESC,rowid DESC LIMIT 500'),audit:await rows('SELECT * FROM admin_actions ORDER BY created_at DESC,rowid DESC LIMIT 500'),settings:await rows('SELECT * FROM settings'),categories:await rows('SELECT * FROM categories ORDER BY name')});
  const reason=required(b.reason,2000);const aid=uid();let statements:any[]=[];
  if(id==='settings'){const amount=whole(b.starterMinutes,0,525600)*60;statements=[query("UPDATE settings SET value=? WHERE id='onboarding_seconds'",String(amount))];}
  else if(id==='category'){statements=b.categoryId?[query('UPDATE categories SET active=? WHERE id=?',b.active?1:0,b.categoryId)]:[query('INSERT INTO categories(id,name) VALUES(?,?)',uid(),required(b.name,100))];}
  else if(id==='suspend'){if(b.userId===u.id)fail('You cannot suspend your own administrator account.');statements=[query('UPDATE users SET suspended=? WHERE id=?',b.suspended?1:0,required(b.userId)),query('DELETE FROM sessions WHERE user_id=?',b.userId)];}
  else if(id==='adjust'){const n=whole(b.seconds,-31536000,31536000);if(!n)fail('Adjustment cannot be zero.');if(!await one('SELECT id FROM users WHERE id=?',b.userId))fail('Member not found.');statements=[query("INSERT INTO ledger(id,source_id,destination_id,amount,type,actor_id,metadata) VALUES(?,?,?,?, 'adjustment',?,?)",aid,n<0?b.userId:null,n>0?b.userId:null,Math.abs(n),u.id,reason)];}
  else if(id==='resolve'){const t=await task(required(b.taskId),u);if(['completed','cancelled'].includes(t.status))fail('This task is already final.');if(b.resolution==='complete'&&(!t.finished_at||!t.actual_seconds||t.status!=='disputed'))fail('Only a disputed, finished task can be settled.');statements=[query("UPDATE tasks SET status=?,problem=?,confirmed_by=?,confirmed_at=unixepoch() WHERE id=? AND status=?",b.resolution==='complete'?'completed':'cancelled',reason,u.id,t.id,t.status)];}
  else fail('Unknown administration action.',404);
  await database().batch([...statements,query('INSERT INTO admin_actions(id,actor_id,action,target_id,reason) VALUES(?,?,?,?,?)',uid(),u.id,id,b.userId||b.taskId||b.categoryId||'settings',reason)]);return reply({ok:true});
 }
 fail('Not found.',404);
 }catch(e:any){const message=String(e.message||e);for(const [key,label] of Object.entries({program_full:'This program has reached its participant capacity.',training_required:'Training required to participate.',partner_unavailable:'The organization or program is not currently available.',support_budget_exceeded:'This allocation exceeds the Time Fund budget.',support_already_reviewed:'This request has already been reviewed.'}))if(message.includes(key))return reply({error:label},409);if(message.includes('insufficient_credit'))return reply({error:'There is not enough available Time Credit for this change. For an overrun, the requester must earn more time or ask an administrator to resolve the dispute.'},409);if(message.includes('UNIQUE constraint'))return reply({error:'This action has already been recorded. Refresh to see the latest state.'},409);if(e.status)return reply({error:e.message},e.status);console.error('Time Bank request failed',e);return reply({error:'We could not save this change. Your existing records are safe. Please refresh and try again.'},500);}}
const nativeOrigins=['capacitor://localhost','http://localhost','https://localhost'];
async function cors(req:Request){const origin=req.headers.get('origin');if(req.method==='OPTIONS'){if(!origin||!nativeOrigins.includes(origin))return new Response(null,{status:403});return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, X-Timebank-Client','Vary':'Origin'}});}const r=await handler(req);if(req.method==='POST'&&/^\/api\/tasks(?:\/[^/]+\/(?:confirm|dispute))?$/.test(new URL(req.url).pathname)&&r.ok){try{await scanFlags()}catch{console.error('Review scan unavailable');}}if(origin&&nativeOrigins.includes(origin)){r.headers.set('Access-Control-Allow-Origin',origin);r.headers.set('Vary','Origin');}return r;}
export const GET=cors;export const POST=cors;export const OPTIONS=cors;
