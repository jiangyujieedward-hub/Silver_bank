'use client';
import {useEffect,useState} from 'react';
import {MessageCircle} from 'lucide-react';
import {Button} from './ui/button';
import {TaskConversation} from './task-conversation';
import {tr} from '@/lib/i18n';
export function TaskContact({task,userId,api}:any){
 const [open,setOpen]=useState(false),[threads,setThreads]=useState<any[]>([]),[visitor,setVisitor]=useState(task.helper_id||''),[messages,setMessages]=useState<any[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const requester=userId===task.requester_id;
 const selected=requester?visitor:userId;
 useEffect(()=>{if(!open)return;let live=true;const load=async()=>{try{if(requester){const list=await api(`tasks/${task.id}/inquiries`);if(live)setThreads(task.helper_id&&!list.some((t:any)=>t.visitor_id===task.helper_id)?[{visitor_id:task.helper_id,name:task.helper_name},...list]:list)}if(selected){const list=await api(`tasks/${task.id}/inquiries?visitor=${encodeURIComponent(selected)}`);if(live)setMessages(list.reverse())}}catch(e:any){if(live)setError(e.message)}finally{if(live)setLoading(false)}};setLoading(true);void load();const timer=setInterval(load,10000);return()=>{live=false;clearInterval(timer)}},[open,task.id,selected,requester,api]);
 const chatAPI=async(path:string,data?:any)=>{const before=new URLSearchParams(path.split('?')[1]||'').get('before');return api(`tasks/${task.id}/inquiries?visitor=${encodeURIComponent(selected)}${before?'&before='+before:''}`,data?{...data,visitor:selected}:undefined)};
 return <div className="task-contact"><Button variant="outline" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><MessageCircle/>{requester?tr('Task conversations'):tr('Contact {name}',{name:task.requester_name})}</Button>{open&&<section className="contact-panel" aria-label={tr('Task conversation')}>
 {requester&&threads.map(t=><Button key={t.visitor_id} variant={visitor===t.visitor_id?'default':'outline'} onClick={()=>{setMessages([]);setVisitor(t.visitor_id)}}>{tr('Contact {name}',{name:t.name})}</Button>)}
 {requester&&!threads.length&&!loading&&<p>{tr('No messages yet.')}</p>}{loading?<p>{tr('Loading…')}</p>:selected&&<TaskConversation key={task.id+selected} taskId={task.id} userId={userId} messages={messages} api={chatAPI}/>}{error&&<p className="error" role="alert">{tr(error)}</p>}
 </section>}</div>
}
