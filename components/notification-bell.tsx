'use client';
import React,{useEffect,useState} from 'react';
import {Bell} from 'lucide-react';
import {Button} from './ui/button';
import {tr,useLanguage} from '@/lib/i18n';
export function NotificationBadge({count}:{count:number}){return count>0?<span className="notification-badge" aria-hidden="true">{count>99?'99+':count}</span>:null;}
export function NotificationBell({userId,api,onOpen}:{userId:string;api:(path:string)=>Promise<any>;onOpen:()=>void}){
 useLanguage();const [count,setCount]=useState(0);
 useEffect(()=>{let active=true;let pending=false;
  const update=async()=>{if(pending)return;pending=true;try{const r=await api('notifications/count');if(active)setCount(r.unread);}catch{/* Keep the last known count during a connection interruption. */}finally{pending=false;}};
  setCount(0);void update();const timer=setInterval(update,15000);
  window.addEventListener('focus',update);window.addEventListener('timebank-notifications-read',update);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',update);window.removeEventListener('timebank-notifications-read',update);};
 },[userId,api]);
 return <Button className="notification-button" variant="ghost" onClick={onOpen} aria-label={count?tr('Open notifications — {count} unread',{count}):tr('Open notifications')}><span className="notification-icon"><Bell/><NotificationBadge count={count}/></span></Button>;
}
