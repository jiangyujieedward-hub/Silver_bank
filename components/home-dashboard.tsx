'use client';
import {ActionDock} from './action-dock';
import React,{useState} from 'react';
import {ArrowRight,Clock,MapPin,Search,Plus,HeartHandshake,ShoppingBag,Package,PawPrint,Flower2,Monitor,House,Languages,BookOpen,Users} from 'lucide-react';
import {tr,localizedTime,getLanguage} from '@/lib/i18n';
import {TaskGallery} from './task-gallery';
import {taskIcon,taskTone} from './task-art';
import {Button} from './ui/button';
export function TaskCard({task:t,onOpen,featured=false}:{task:any,onOpen:()=>void,featured?:boolean}){const Icon=taskIcon(t.category);const tone=taskTone(t.category_id);return <button className={'task-card flashcard tone-'+tone+(featured?' featured-task':'')} onClick={onOpen}>
 <h3 className="visual-task-title">{t.title}</h3><div className="visual-task-art"><Icon aria-hidden="true" strokeWidth={1.2}/></div><div className="visual-task-duration"><Clock size={21}/>{localizedTime(t.estimated_seconds)}</div>{t.status!=='open'&&<span className="status">{tr(({accepted:'Ready to begin',in_progress:'In progress',awaiting_confirmation:'Confirm completion',completed:'Completed',cancelled:'Cancelled',disputed:'Under review'} as any)[t.status]||t.status)}</span>}
 </button>}
export function HomeDashboard({me,tasks,nav,give}:{me:any,tasks:any[],nav:(p:string)=>void,give:()=>void}){const [search,setSearch]=useState('');const shown=tasks.filter(t=>(t.title+' '+t.category+' '+t.location).toLocaleLowerCase().includes(search.toLocaleLowerCase()));return <>
 <div className="home-intro"><button className="home-location" onClick={()=>nav('profile')}><MapPin size={18}/>{me.user.location||tr('General service area')}</button><h1>{tr('Hi, {name}',{name:me.user.name})}</h1></div>
 <section className="home-balance"><div><span>{tr('My Time Balance')}</span><strong>{localizedTime(me.balance.available)}</strong>{me.balance.reserved>0&&<small>{localizedTime(me.balance.reserved)} {tr('reserved')}</small>}</div><button className="round-action" onClick={()=>nav('bank')} aria-label={tr('View my time activity')}><ArrowRight/></button></section>
 <ActionDock className="home-action-dock" label={tr('Give Time')+' / '+tr('Get Help')} items={[{icon:<HeartHandshake/>,label:tr('Give Time'),onClick:give,className:'primary-action'},{icon:<Plus/>,label:tr('Get Help'),onClick:()=>nav('create')}]}/>
 <label className="home-search"><Search size={21}/><input type="search" aria-label={tr('Search requests')} placeholder={tr('Search requests')} value={search} onChange={e=>setSearch(e.target.value)}/></label>
 <section className="local-requests"><div className="section-title"><h2>{tr('In your area')}</h2><Button variant="link" onClick={give}>{tr('View all')}<ArrowRight size={18}/></Button></div>{shown.length?<TaskGallery onOpen={t=>nav('task/'+t.id)} tasks={shown.slice(0,8)} card={t=><TaskCard key={t.id} task={t} onOpen={()=>nav('task/'+t.id)}/>}/>:<div className="empty"><MapPin/><h3>{tr('No requests found')}</h3><Button variant="link" onClick={give}>{tr('View all')}</Button></div>}</section>
 </>}
