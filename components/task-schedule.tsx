'use client';
import {useState} from 'react';
import {Button} from './ui/button';
import {Input} from './silver/input';
import {tr,getLanguage} from '@/lib/i18n';
const escapeCalendar=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const utc=(s:number)=>new Date(s*1000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
export function calendarFile(task:any){return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Silver Bank//Task reminder//EN','BEGIN:VEVENT',`UID:${task.id}@silver-bank`,`DTSTAMP:${utc(Date.now()/1000)}`,`DTSTART:${utc(task.requested_at)}`,`DTEND:${utc(task.requested_at+task.estimated_seconds)}`,`SUMMARY:${escapeCalendar(task.title)}`,`LOCATION:${escapeCalendar(task.location)}`,`DESCRIPTION:${escapeCalendar('Silver Bank: '+task.title)}`,'BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY',`DESCRIPTION:${escapeCalendar(task.title)}`,'END:VALARM','BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY',`DESCRIPTION:${escapeCalendar(task.title)}`,'END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n')+'\r\n'}
export function TaskSchedule({task:t,userId,now,busy,action}:{task:any,userId:string,now:number,busy:boolean,action:(action:string,data?:any)=>Promise<any>}){
 const [error,setError]=useState(''),[saved,setSaved]=useState(false);
 const requester=t.requester_id===userId,participant=requester||t.helper_id===userId;
 const agreed=requester?t.requester_agreed:t.helper_agreed,both=t.requester_agreed&&t.helper_agreed,ready=requester?t.requester_ready:t.helper_ready;
 const date=new Date(t.requested_at*1000).toLocaleString(getLanguage());
 const call=async(name:string,data:any={})=>{setError('');try{await action(name,data)}catch(e:any){setError(e.message)}};
 if(!participant)return null;
 return <section className="task-schedule"><h3>{tr(both?'Scheduled':'Confirm the date')}</h3><p>{date}</p><p>{t.requester_name}: {tr(t.requester_agreed?'Confirmed':'Not confirmed')}<br/>{t.helper_name}: {tr(t.helper_agreed?'Confirmed':'Not confirmed')}</p>
 {!agreed&&<Button disabled={busy} onClick={()=>call('agree',{requestedAt:t.requested_at})}>{tr('Agree to this date')}</Button>}
 {both&&<><Button variant="outline" onClick={()=>{const url=URL.createObjectURL(new Blob([calendarFile(t)],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='silver-bank-task.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);setSaved(true)}}>{tr('Add to calendar')}</Button>{saved&&<p role="status">{tr('Open the calendar file and save the event. Your calendar controls reminder sounds. Add it again if the date changes.')}</p>}
 {now<t.requested_at?<p>{tr('Start becomes available at the agreed time.')}</p>:<><p>{tr('Start when you are both together and ready.')}</p>{ready?<p>{tr('Waiting for the other person to start.')}</p>:<Button disabled={busy} onClick={()=>call('start')}>{tr('Start now')}</Button>}</>}
 </>}
 {requester&&<details><summary>{tr('Change date')}</summary><form onSubmit={e=>{e.preventDefault();const date=String(new FormData(e.currentTarget).get('date'));call('schedule',{requestedAt:new Date(date).toISOString(),previousDate:t.requested_at});setSaved(false)}}><label className="field"><span>{tr('Requested date and time')}</span><Input name="date" type="datetime-local" required/></label><Button disabled={busy}>{tr('Propose new date')}</Button></form></details>}
 {error&&<p className="error" role="alert">{tr(error)}</p>}
 </section>
}
