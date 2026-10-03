'use client';
import React,{useEffect,useState} from 'react';
import {TaskPreviewLink} from './silver/task-link';
import CircularGallery from './CircularGallery';
import {taskCardImage} from './task-art';
import {Button} from './ui/button';
import {tr,useLanguage} from '@/lib/i18n';
export function TaskGallery({tasks,card,onOpen}:{tasks:any[],card:(task:any)=>React.ReactNode,onOpen:(task:any)=>void}){
 const [list,setList]=useState(false),[reduced,setReduced]=useState(false),[failed,setFailed]=useState(false),[items,setItems]=useState<any[]>([]);const language=useLanguage();
 // Server polling returns fresh objects; only regenerate textures when card data changes.
 const signature=JSON.stringify(tasks.map(t=>[t.id,t.title,t.category,t.category_id,t.estimated_seconds]));
 useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(q.matches);update();q.addEventListener('change',update);return()=>q.removeEventListener('change',update)},[]);
 useEffect(()=>{let live=true;setItems([]);setFailed(false);Promise.all(tasks.map(async t=>({id:t.id,image:await taskCardImage(t),text:''}))).then(v=>{if(live)setItems(v)}).catch(()=>{if(live)setFailed(true)});return()=>{live=false}},[signature,language]);
 return <section className="task-gallery">{tasks.length>1&&!reduced&&!failed&&<div className="gallery-controls"><Button variant="outline" onClick={()=>setList(!list)}>{tr(list?'Gallery view':'List view')}</Button></div>}{tasks.length<2||list||reduced||failed||!items.length?<div className="task-grid">{tasks.map(card)}</div>:<><div className="gallery-stage"><CircularGallery ariaLabel={tr('Task gallery. Use arrow keys to browse and Enter to open a task.')} items={items} bend={3} textColor="#ffffff" borderRadius={0.05} scrollEase={0.02} font={'bold 30px "Google Sans"'} onSelect={(id:string)=>{const task=tasks.find(t=>t.id===id);if(task)onOpen(task)}} onError={()=>setFailed(true)}/></div><div className="gallery-task-links" aria-label={tr('Community tasks')}>{tasks.map(t=><TaskPreviewLink key={t.id} task={t} onOpen={()=>onOpen(t)}/>)}</div></>}</section>;
}
