'use client';
// Adapted from Animate UI community Notification List; uses real notifications.
import {useState} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {Bell,ArrowRight,ChevronDown} from 'lucide-react';
import {tr,translateNotification,getLanguage} from '@/lib/i18n';
export function NotificationList({items,onOpen}:{items:any[],onOpen:(item:any)=>void}){
 const [expanded,setExpanded]=useState(false);const reduce=useReducedMotion();const visible=expanded?items:items.slice(0,3);
 return <section className="silver-notifications" onMouseEnter={()=>setExpanded(true)}><button type="button" className="notification-expand" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><Bell/><b>{tr('Notifications')}</b><span>{items.length}</span><ChevronDown style={{transform:expanded?'rotate(180deg)':undefined}}/></button><div className="notification-stack">{visible.map((n,i)=><motion.button type="button" key={n.id} className={'silver-notification '+(!n.read_at?'unread':'')} initial={false} animate={{marginTop:!expanded&&i?-42:8,scaleX:expanded?1:1-i*.035}} transition={reduce?{duration:0}:{type:'spring',stiffness:300,damping:26}} style={{zIndex:visible.length-i}} onFocus={()=>setExpanded(true)} onClick={()=>{if(!expanded)setExpanded(true);else onOpen(n)}}><span className="notification-symbol"><Bell/></span><span><b>{translateNotification(n.text)}</b><small>{new Date(n.created_at*1000).toLocaleString(getLanguage())} · {tr(n.read_at?'Read':'Unread')}</small></span><ArrowRight/></motion.button>)}</div></section>;
}
