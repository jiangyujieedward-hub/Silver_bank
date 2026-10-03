import {one,rows,query,database,run,fail,required,clean,whole,uid,balance} from './bank';
import {requireParticipation,organizationCapabilities} from './verification';
import {validCommunity} from './communities';

const kinds=['training','exchange','support','community','task'];
const log=(u:any,action:string,id:string,reason:string)=>query('INSERT INTO admin_actions(id,actor_id,action,target_id,reason) VALUES(?,?,?,?,?)',uid(),u.id,'partner_'+action,id,reason);
const notify=(user:string,text:string)=>query('INSERT INTO notifications(id,user_id,text) VALUES(?,?,?)',uid(),user,text);
async function access(u:any,organizationId:string,permission?:string){
 const o=await one("SELECT o.*,m.role AS staff_role FROM organizations o JOIN organization_members m ON m.organization_id=o.id WHERE o.id=? AND m.user_id=? AND m.active=1",organizationId,u.id);
 if(!o)fail('Organization access is not available.',403);
 const caps=organizationCapabilities(o,o.staff_role);
 if(!caps.verified)fail('Current organization verification is required.',403);
 if(permission&&!(caps as any)[permission])fail('Your staff role cannot make this change.',403);
 return {o,caps};
}
const permission=(p:any)=>p.kind==='training'?'manageTraining':'managePrograms';
async function owned(u:any,id:string,write=false){const p=await one('SELECT * FROM partner_programs WHERE id=?',id);if(!p)fail('Program not found.',404);const a=await access(u,p.organization_id,write?permission(p):undefined);return {p,...a};}
async function sponsor(org:string){const m=await one("SELECT user_id FROM organization_members WHERE organization_id=? AND role='owner' AND active=1",org);if(!m)fail('An active organization owner is required.',409);return m.user_id;}
async function eligible(u:any){if(u.account_type!=='individual')fail('Participation is for individual community members.',403);await requireParticipation(u);}
async function trainingLink(id:any,org:string){if(!id)return null;const p=await one("SELECT id FROM partner_programs WHERE id=? AND organization_id=? AND kind='training' AND status='published'",required(id),org);if(!p)fail('Choose published training from your organization.');return p.id;}
export async function taskPreparation(taskId:string,userId:string){
 return one("SELECT p.id,p.title,b.id AS badge_id FROM partner_task_links l JOIN partner_programs p ON p.id=l.required_training_id LEFT JOIN partner_badges b ON b.program_id=p.id AND b.user_id=? AND b.revoked_at IS NULL AND (b.expires_at IS NULL OR b.expires_at>unixepoch()) WHERE l.task_id=?",userId,taskId);
}
function taskStatements(p:any,owner:string,count:number,firstId?:string){
 return Array.from({length:count},(_,i)=>{const id=i===0&&firstId?firstId:uid();return [
 query('INSERT INTO tasks(id,requester_id,title,description,category_id,location,remote,estimated_seconds,requested_at) VALUES(?,?,?,?,?,?,?,?,?)',id,owner,p.title,p.description+(p.skills?'\nSkills: '+p.skills:''),p.category_id,p.location,0,p.duration,p.requested_at),
 query('INSERT INTO partner_task_links(task_id,program_id,required_training_id) VALUES(?,?,?)',id,p.id,p.required_training_id)
 ]}).flat();
}
const publicSelect="SELECT p.*,COALESCE(NULLIF(o.public_name,''),o.legal_name) AS organization_name FROM partner_programs p JOIN organizations o ON o.id=p.organization_id";
export async function partnerRoute(u:any,id:string|undefined,b:any,post:boolean){
 if(!id&&!post){
  const {o,caps}=await access(u,required(b.organizationId));
  const programs=await rows("SELECT p.*,(SELECT COUNT(*) FROM partner_enrollments e WHERE e.program_id=p.id AND e.status NOT IN ('withdrawn','declined')) AS enrolled,(SELECT COUNT(*) FROM partner_enrollments e WHERE e.program_id=p.id AND e.status='completed') AS completed FROM partner_programs p WHERE organization_id=? ORDER BY created_at DESC",o.id);
  const participants=await rows("SELECT e.*,u.name,p.title,p.kind FROM partner_enrollments e JOIN partner_programs p ON p.id=e.program_id JOIN users u ON u.id=e.user_id WHERE p.organization_id=? ORDER BY e.created_at DESC LIMIT 500",o.id);
  const tasks=await rows("SELECT t.*,p.title AS program_title,h.name AS helper_name,l.program_id FROM partner_task_links l JOIN partner_programs p ON p.id=l.program_id JOIN tasks t ON t.id=l.task_id LEFT JOIN users h ON h.id=t.helper_id WHERE p.organization_id=? ORDER BY t.created_at DESC LIMIT 500",o.id);
  const badges=await rows("SELECT b.*,u.name,p.title FROM partner_badges b JOIN partner_programs p ON p.id=b.program_id JOIN users u ON u.id=b.user_id WHERE p.organization_id=?",o.id);
  const supports=caps.managePrograms?await rows("SELECT s.*,(SELECT COALESCE(SUM(amount),0) FROM partner_support_usage WHERE support_id=s.id) AS used,u.name,p.title FROM partner_support s JOIN partner_programs p ON p.id=s.program_id JOIN users u ON u.id=s.user_id WHERE p.organization_id=? ORDER BY s.created_at DESC",o.id):[];
  const matches=await rows("SELECT m.*,a.name AS sharer_name,b.name AS learner_name,p.title FROM partner_matches m JOIN partner_programs p ON p.id=m.program_id JOIN users a ON a.id=m.sharer_id JOIN users b ON b.id=m.learner_id WHERE p.organization_id=?",o.id);
  const needs=await rows("SELECT c.id,c.name,COUNT(*) AS requests,SUM(CASE WHEN t.created_at<unixepoch()-604800 THEN 1 ELSE 0 END) AS waiting,MIN(t.created_at) AS oldest FROM tasks t JOIN categories c ON c.id=t.category_id JOIN users u ON u.id=t.requester_id WHERE t.status='open' AND u.suspended=0 GROUP BY c.id ORDER BY requests DESC");
  const locations=await rows("SELECT location,COUNT(*) AS requests FROM tasks WHERE status='open' GROUP BY location ORDER BY requests DESC LIMIT 20");
  const impact=await one("SELECT COUNT(*) AS activities,COALESCE(SUM(CASE WHEN t.status='completed' THEN 1 ELSE 0 END),0) AS completed,COALESCE(SUM(CASE WHEN t.status='completed' THEN t.actual_seconds ELSE 0 END),0) AS circulated FROM partner_task_links l JOIN partner_programs p ON p.id=l.program_id JOIN tasks t ON t.id=l.task_id WHERE p.organization_id=?",o.id);
  const members=await rows('SELECT m.user_id,m.role,u.name FROM organization_members m JOIN users u ON u.id=m.user_id WHERE m.organization_id=? AND m.active=1',o.id);
  const ledger=caps.managePrograms?await rows("SELECT l.id,l.amount,l.type,l.created_at,p.title FROM ledger l JOIN partner_support s ON s.ledger_id=l.id JOIN partner_programs p ON p.id=s.program_id WHERE p.organization_id=? UNION ALL SELECT l.id,l.amount,l.type,l.created_at,p.title FROM ledger l JOIN partner_task_links t ON t.task_id=l.task_id JOIN partner_programs p ON p.id=t.program_id WHERE p.organization_id=? ORDER BY 4 DESC LIMIT 500",o.id,o.id):[];
  return {organization:{id:o.id,name:o.public_name||o.legal_name,status:o.status,review_due:o.review_due,role:o.staff_role,mission:o.mission,website:o.website},capabilities:caps,members,programs,participants,tasks,badges,supports,matches,needs,locations,impact,ledger,funding:caps.managePrograms?await balance(await sponsor(o.id)):null};
 }
 if(id==='save'&&post){
  const org=required(b.organizationId);let existing:any=null;if(b.id){existing=(await owned(u,required(b.id),true)).p;if(existing.organization_id!==org)fail('Organization mismatch.',403);}
  const kind=existing?.kind||required(b.kind);if(!kinds.includes(kind))fail('Choose a program type.');await access(u,org,permission({kind}));
  if(existing&&Number(b.version)!==existing.version)fail('This program changed. Refresh before editing.',409);
  if(existing?.kind==='task'&&await one('SELECT task_id FROM partner_task_links WHERE program_id=? LIMIT 1',existing.id))fail('Published task details are fixed. Create a new task for a different schedule.',409);
  const loc=required(b.location,200);if(!validCommunity(loc))fail('Choose a community.');
  const scheduled=b.requestedAt?Math.floor(Date.parse(b.requestedAt)/1000):null;if(scheduled!==null&&!Number.isFinite(scheduled))fail('Choose a valid schedule.');
  const category=clean(b.categoryId)||null;if(category&&!await one('SELECT id FROM categories WHERE id=? AND active=1',category))fail('Choose an available category.');
  const training=await trainingLink(b.requiredTrainingId,org);
  const related=clean(b.relatedProgramId)||null;if(related&&related===existing?.id)fail('Choose a different related program.');if(related&&!await one('SELECT id FROM partner_programs WHERE id=? AND organization_id=?',related,org))fail('Choose a program from your organization.');
  const pid=existing?.id||uid(),budget=whole(b.budgetMinutes||0,0,525600)*60;
  if(budget<Number((await one("SELECT COALESCE(SUM(amount),0) AS n FROM partner_support WHERE program_id=? AND status='approved'",pid)).n))fail('Budget cannot be below credit already allocated.');
  const values=[required(b.title,160),required(b.description,5000),category,loc,scheduled,whole(b.minutes||60,1,10080)*60,whole(b.capacity||20,1,kind==='task'?20:100),clean(b.requirements,3000),clean(b.materials,8000),clean(b.modules,8000),clean(b.completion,3000),clean(b.badge,120),b.validDays?whole(b.validDays,1,3650):null,training,related,clean(b.skills,2000),budget];
  const columns='title,description,category_id,location,requested_at,duration,capacity,requirements,materials,modules,completion,badge,valid_days,required_training_id,related_program_id,skills,budget';
  const statement=existing?query('UPDATE partner_programs SET '+columns.split(',').map(c=>c+'=?').join(',')+",version=version+1 WHERE id=? AND version=?",...values,pid,existing.version):query('INSERT INTO partner_programs(id,organization_id,kind,'+columns+',created_by) VALUES('+Array(21).fill('?').join(',')+')',pid,org,kind,...values,u.id);
  await database().batch([statement,log(u,'save',pid,'Program saved')]);return {id:pid};
 }
 if(id==='publish'&&post){
  const {p}=await owned(u,required(b.id),true);if(Number(b.version)!==p.version)fail('Program changed. Refresh.',409);
  const status=b.publish?'published':'draft';const batch:any[]=[];
  if(b.publish){
   if(p.kind==='training'&&(!p.badge||!p.modules||!p.completion))fail('Add modules, completion requirements and a Skill Badge before publishing.');
   if(p.kind==='support'&&(!p.requirements||p.budget<=0))fail('Add eligibility requirements and a Time Fund budget.');
   if(p.kind==='task'&&!await one('SELECT task_id FROM partner_task_links WHERE program_id=?',p.id)){
    if(!p.category_id||!p.requested_at||p.requested_at<=Date.now()/1000)fail('Add a category and future task schedule.');
    const owner=await sponsor(p.organization_id);batch.push(...taskStatements(p,owner,p.capacity));
   }
  }else if(p.kind==='task'&&await one('SELECT task_id FROM partner_task_links WHERE program_id=?',p.id)){
   fail('Use Cancel open places to withdraw community tasks. Started tasks remain with their participants.',409);
  }
  await database().batch([query('UPDATE partner_programs SET status=?,version=version+1 WHERE id=? AND version=?',status,p.id,p.version),...batch,log(u,'publish',p.id,status)]);return {ok:true};
 }
 if(id==='review'&&post){
  const {p}=await owned(u,required(b.programId),true);const user=required(b.userId),e=await one('SELECT * FROM partner_enrollments WHERE program_id=? AND user_id=?',p.id,user);
  if(!e)fail('Enrollment not found.',404);if(user===u.id)fail('Another authorized staff member must review your completion.',403);if(!['enrolled','completed','declined'].includes(b.status))fail('Choose a participation status.');
  if(b.status==='completed'&&e.status!=='submitted')fail('The participant must submit completion first.',409);
  await database().batch([query("UPDATE partner_enrollments SET status=?,review_note=?,reviewer_id=?,completed_at=CASE WHEN ?='completed' THEN unixepoch() ELSE NULL END WHERE id=? AND status=?",b.status,required(b.reason,2000),u.id,b.status,e.id,e.status),notify(user,p.title+': participation review updated.'),log(u,'review',e.id,b.reason)]);return {ok:true};
 }
 if(id==='badge'&&post){
  const {p}=await owned(u,required(b.programId),true);if(p.kind!=='training')fail('Badges require a training program.');const user=required(b.userId),reason=required(b.reason,2000);if(user===u.id)fail('Another authorized training manager must issue or revoke your badge.',403);
  if(b.revoke){await database().batch([query('UPDATE partner_badges SET revoked_at=unixepoch(),reason=? WHERE program_id=? AND user_id=? AND revoked_at IS NULL',reason,p.id,user),log(u,'revoke_badge',p.id,reason),notify(user,p.title+': Skill Badge revoked. Contact the organization for details.')]);}
  else{if(!await one("SELECT id FROM partner_enrollments WHERE program_id=? AND user_id=? AND status='completed'",p.id,user))fail('Review completion before issuing a badge.');
   await database().batch([query('INSERT INTO partner_badges(id,program_id,user_id,label,issued_by,expires_at,reason) VALUES(?,?,?,?,?,?,?) ON CONFLICT(program_id,user_id) DO UPDATE SET revoked_at=NULL,expires_at=excluded.expires_at,issued_by=excluded.issued_by,reason=excluded.reason,created_at=unixepoch()',uid(),p.id,user,p.badge,u.id,p.valid_days?Math.floor(Date.now()/1000)+p.valid_days*86400:null,reason),log(u,'issue_badge',p.id,reason),notify(user,'Skill Badge received: '+p.badge)]);
  }return {ok:true};
 }
 if(id==='support'&&post){
  const s=await one('SELECT * FROM partner_support WHERE id=?',required(b.id));if(!s)fail('Request not found.',404);
  const {p}=await owned(u,s.program_id,true);if(s.user_id===u.id)fail('Another authorized manager must review your request.',403);if(s.status!=='pending')fail('Already reviewed.',409);const reason=required(b.reason,2000),approved=b.approve===true,ledgerId=approved?uid():null;
  const batch=[query('UPDATE partner_support SET status=?,review_note=?,reviewer_id=?,ledger_id=? WHERE id=? AND status=\'pending\'',approved?'approved':'declined',reason,u.id,ledgerId,s.id)];
  if(approved){await eligible(await one('SELECT * FROM users WHERE id=?',s.user_id));batch.push(query("INSERT INTO ledger(id,source_id,destination_id,amount,type,actor_id,metadata) VALUES(?,?,?,?,'sponsorship',?,?)",ledgerId,await sponsor(p.organization_id),s.user_id,s.amount,u.id,'Community Time Support: '+p.title));}
  await database().batch([...batch,log(u,'support_review',s.id,reason),notify(s.user_id,p.title+': your private Time Support request has been reviewed.')]);return {ok:true};
 }
 if(id==='match'&&post){
  const {p}=await owned(u,required(b.programId),true);if(p.kind!=='exchange')fail('Choose a Skill Exchange Program.');
  const sharer=required(b.sharerId),learner=required(b.learnerId);if(sharer===learner)fail('Choose two different participants.');
  for(const [user,role] of [[sharer,'sharer'],[learner,'learner']])if(!await one("SELECT id FROM partner_enrollments WHERE program_id=? AND user_id=? AND role IN (?, 'both') AND status NOT IN ('declined','withdrawn')",p.id,user,role))fail('Choose enrolled sharers and learners.');
  let tid:string|null=null;const batch:any[]=[];
  if(b.credited===true||b.credited==='yes'){if(!p.category_id||!p.requested_at||p.requested_at<=Date.now()/1000)fail('Set a category and future schedule before creating a credited exchange.');tid=uid();batch.push(...taskStatements(p,await sponsor(p.organization_id),1,tid));}
  // Credited contributions are offered as real shared tasks; settlement remains bilateral.
  await database().batch([...batch,query('INSERT INTO partner_matches(id,program_id,sharer_id,learner_id,task_id) VALUES(?,?,?,?,?)',uid(),p.id,sharer,learner,tid),log(u,'match',p.id,'Sharer and learner matched'),notify(sharer,p.title+': a skill exchange match is ready.'),notify(learner,p.title+': a skill exchange match is ready.')]);return {ok:true};
 }
 if(id==='cancel-places'&&post){
  const {p}=await owned(u,required(b.programId),true);const reason=required(b.reason,2000);
  await database().batch([query("UPDATE tasks SET status='cancelled',problem=? WHERE id IN (SELECT task_id FROM partner_task_links WHERE program_id=?) AND status IN ('open','accepted')",reason,p.id),query("UPDATE partner_programs SET status='closed',version=version+1 WHERE id=?",p.id),log(u,'cancel_places',p.id,reason)]);return {ok:true};
 }
 if(id==='task-action'&&post){
  const t=await one('SELECT t.*,l.program_id FROM tasks t JOIN partner_task_links l ON l.task_id=t.id WHERE t.id=?',required(b.taskId));if(!t)fail('Community task not found.',404);await owned(u,t.program_id,true);
  const actions:Record<string,string>={agree:"UPDATE tasks SET requester_agreed=1 WHERE id=? AND status='accepted' AND requested_at=?",start:"UPDATE tasks SET requester_ready=1,status=CASE WHEN helper_ready=1 THEN 'in_progress' ELSE status END,started_at=CASE WHEN helper_ready=1 THEN unixepoch() ELSE NULL END WHERE id=? AND status='accepted' AND requester_agreed=1 AND helper_agreed=1 AND requested_at<=unixepoch()",confirm:"UPDATE tasks SET status='completed',confirmed_by=requester_id,confirmed_at=unixepoch() WHERE id=? AND status='awaiting_confirmation' AND finished_by=helper_id"};
  if(!actions[b.action])fail('Choose a valid task action.');
  const args=b.action==='agree'?[t.id,whole(b.requestedAt,1,Number.MAX_SAFE_INTEGER)]:[t.id];
  const result=await database().batch([query(actions[b.action],...args),log(u,'task_'+b.action,t.id,'Authorized organization action')]);if(!result[0].meta.changes)fail('This task is not ready for that action. Refresh.',409);return {ok:true};
 }
 if(id==='staff-role'&&post){
  const {o}=await access(u,required(b.organizationId));if(o.staff_role!=='owner')fail('Owner access required.',403);
  if(!['staff','program_manager','training_manager'].includes(b.role))fail('Choose a staff role.');
  const m=await one("SELECT id FROM organization_members WHERE organization_id=? AND user_id=? AND active=1 AND role<>'owner'",o.id,required(b.userId));if(!m)fail('Staff member not found.',404);
  await database().batch([query('UPDATE organization_members SET role=? WHERE id=?',b.role,m.id),log(u,'staff_role',m.id,'Staff role changed to '+b.role)]);return {ok:true};
 }
 if(id==='profile'&&post){
  const {o}=await access(u,required(b.organizationId));if(o.staff_role!=='owner')fail('Owner access required.',403);
  const website=clean(b.website,500);if(website){let url;try{url=new URL(website)}catch{fail('Use an HTTPS website address.')}if(url.protocol!=='https:')fail('Use an HTTPS website address.');}
  await database().batch([query('UPDATE organizations SET public_name=?,mission=?,website=? WHERE id=?',required(b.publicName,200),required(b.mission,2000),website,o.id),log(u,'profile',o.id,'Public profile updated')]);return {ok:true};
 }
 fail('Partner action not found.',404);
}
export async function programsRoute(u:any,id:string|undefined,b:any,post:boolean){
 if(!id&&!post)return {
  programs:await rows(publicSelect+" WHERE p.status='published' AND o.status='verified' AND o.review_due>unixepoch() ORDER BY p.created_at DESC LIMIT 200"),
  enrollments:await rows('SELECT * FROM partner_enrollments WHERE user_id=?',u.id),
  badges:await rows('SELECT b.*,p.title FROM partner_badges b JOIN partner_programs p ON p.id=b.program_id WHERE b.user_id=?',u.id),
  support:await rows('SELECT s.*,(SELECT COALESCE(SUM(amount),0) FROM partner_support_usage WHERE support_id=s.id) AS used,p.title FROM partner_support s JOIN partner_programs p ON p.id=s.program_id WHERE s.user_id=?',u.id),
  matches:await rows("SELECT m.*,p.title,a.name AS sharer_name,b.name AS learner_name FROM partner_matches m JOIN partner_programs p ON p.id=m.program_id JOIN users a ON a.id=m.sharer_id JOIN users b ON b.id=m.learner_id WHERE m.sharer_id=? OR m.learner_id=?",u.id,u.id)
 };
 if(!post)fail('Not found.',404);await eligible(u);
 if(id==='match-confirm'){
  const m=await one('SELECT * FROM partner_matches WHERE id=? AND (sharer_id=? OR learner_id=?)',required(b.id),u.id,u.id);if(!m)fail('Match not found.',404);
  const col=u.id===m.sharer_id?'sharer_confirmed':'learner_confirmed',other=u.id===m.sharer_id?'learner_confirmed':'sharer_confirmed';
  await run("UPDATE partner_matches SET "+col+"=1,status=CASE WHEN "+other+"=1 THEN 'completed' ELSE status END WHERE id=? AND status='matched'",m.id);return {ok:true};
 }
 const p=await one(publicSelect+" WHERE p.id=? AND p.status='published' AND o.status='verified' AND o.review_due>unixepoch()",required(b.programId));if(!p)fail('This program is not open.',404);
 if(id==='join'){
  if(['support','task'].includes(p.kind))fail('Use the support request or community task action.');
  if(p.required_training_id&&!await one('SELECT id FROM partner_badges WHERE program_id=? AND user_id=? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>unixepoch())',p.required_training_id,u.id))fail('Complete the required training first.',403);
  const role=p.kind==='exchange'?required(b.role):'participant';if(!['participant','sharer','learner','both'].includes(role))fail('Choose how you would like to participate.');
  await run('INSERT INTO partner_enrollments(id,program_id,user_id,role) VALUES(?,?,?,?)',uid(),p.id,u.id,role);return {ok:true};
 }
 if(id==='progress'){
  const result=await run("UPDATE partner_enrollments SET progress=?,status='submitted' WHERE program_id=? AND user_id=? AND status='enrolled'",required(b.progress,4000),p.id,u.id);if(!result.meta.changes)fail('Enroll before submitting completion, or wait for your review.',409);return {ok:true};
 }
 if(id==='support'){
  if(p.kind!=='support')fail('Choose a Time Support program.');
  const amount=whole(b.minutes,1,10080)*60;if(amount>p.budget)fail('Request exceeds the fund budget.');
  await run('INSERT INTO partner_support(id,program_id,user_id,amount,reason) VALUES(?,?,?,?,?)',uid(),p.id,u.id,amount,required(b.reason,3000));return {ok:true};
 }
 fail('Program action not found.',404);
}
