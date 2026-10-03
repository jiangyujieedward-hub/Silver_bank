import {validateSignature} from './signature';
import {normalizePhone} from './phone';
import policies from './policies.json';
import {clean,required,fail,query,uid,one} from './bank';
export {policies};
export const languages=[{id:'zh-Hant',name:'繁體中文'},{id:'en',name:'English'},{id:'de',name:'Deutsch'},{id:'fr',name:'Français'},{id:'ja',name:'日本語'}];
export const ageBands=['under18','18-24','25-34','35-44','45-54','55-64','65-74','75plus'];
export const agreed=(v:any)=>v===true||v==='on'||v==='true';
export function details(b:any,organization=false){let phone:string;try{phone=normalizePhone(b)}catch(e:any){fail(e.message)}const language=required(b.language,20);if(!languages.some(l=>l.id===language))fail('Choose a supported language.');const ageBand=organization?'':required(b.ageBand,20);if(!organization&&!ageBands.includes(ageBand))fail('Choose your age range.');return {phone,language,ageBand};}
export function acceptance(b:any,userId:string,taskId:string|null=null){const docs=taskId?policies.filter(p=>p.kind==='private'):policies;const signature=required(b.signature,100);let drawing:string;try{drawing=validateSignature(b.signatureDrawing)}catch(e:any){fail(e.message,428)}return docs.map(p=>{if(!agreed(b[p.kind+'Agreed'])||b[p.kind+'Version']!==p.version)fail('Please read and agree to the current guidelines before continuing.',428);if(taskId&&!agreed(b.taskUnderstood))fail('Please confirm that you understand this task.',428);return query('INSERT OR IGNORE INTO agreement_acceptances(id,user_id,task_id,kind,version,signature,signature_drawing) VALUES(?,?,?,?,?,?,?)',uid(),userId,taskId,p.kind,p.version,signature,drawing);});}
export async function needsOnboarding(u:any){if(!u.phone||(u.account_type!=='organization'&&!u.age_band)||!u.location)return true;for(const p of policies){if(!await one('SELECT id FROM agreement_acceptances WHERE user_id=? AND task_id IS NULL AND kind=? AND version=?',u.id,p.kind,p.version))return true;}return false;}
