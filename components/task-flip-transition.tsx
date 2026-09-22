'use client';
import {useEffect,useState} from 'react';
import FlipCard from './FlipCard';
import {taskIcon} from './task-art';
import {localizedTime,tr,getLanguage} from '@/lib/i18n';
export function TaskFlipTransition({task}:{task:any}){const [flipped,setFlipped]=useState(false);const Icon=taskIcon(task.category);useEffect(()=>{const id=requestAnimationFrame(()=>setFlipped(true));return()=>cancelAnimationFrame(id)},[]);return <div className="task-flip-transition" aria-hidden="true"><FlipCard flipped={flipped} flipOnClick={false} draggable={false} tilt={false} glare glareOpacity={.22} hoverScale={1} perspective={1100} stiffness={170} damping={20} width={300} height={400} radius={22} background="#e5f1fa" color="#17263d" shadowOpacity={.16} disabled front={<div className="task-flip-face"><h2>{task.title}</h2><Icon size={190} strokeWidth={1.2}/><strong>{localizedTime(task.estimated_seconds)}</strong></div>} back={<div className="task-flip-face task-flip-details"><h2>{task.title}</h2><p>{task.description}</p><span>{task.location}</span><span>{new Date(task.requested_at*1000).toLocaleString(getLanguage())}</span><strong>{localizedTime(task.estimated_seconds)}</strong></div>}/></div>}
