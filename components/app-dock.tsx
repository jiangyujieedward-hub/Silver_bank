'use client';
import React,{useEffect,useState} from 'react';
import {Home,Search,Plus,Clock,UserRound} from 'lucide-react';
import Dock from './Dock';
import {tr,useLanguage} from '@/lib/i18n';
export function AppDock({page,nav}:{page:string,nav:(page:string)=>void}){
 useLanguage();const [still,setStill]=useState(true);useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce), (hover: none)');const update=()=>setStill(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
 const routes=[['home','Home',Home],['tasks','Tasks',Search],['create','Create',Plus],['bank','Time Bank',Clock],['profile','Profile',UserRound]] as const;
 const items=routes.map(([id,label,Icon])=>({icon:<Icon size={24}/>,label:tr(label),active:page===id||(id==='tasks'&&page.startsWith('task/')),className:page===id?'active':'',onClick:()=>nav(id)}));
 return <nav className="app-dock" aria-label={tr('Main navigation')}><Dock items={items} panelHeight={68} baseItemSize={50} magnification={still?50:70} dockHeight={100}/></nav>;
}
