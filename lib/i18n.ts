'use client';
import {useSyncExternalStore} from 'react';
import catalogue from './translations.json';
export type Language='en'|'zh-Hant'|'de'|'fr'|'ja';
const supported=['en','zh-Hant','de','fr','ja'];let current:Language='en';const listeners=new Set<()=>void>();
export function getLanguage(){return current;}
export function setLanguage(value:string){if(!supported.includes(value))return;current=value as Language;if(typeof window!=='undefined'){document.documentElement.lang=value;try{localStorage.setItem('timebank-language',value)}catch{}}listeners.forEach(fn=>fn());}
export function initializeLanguage(){try{const saved=localStorage.getItem('timebank-language');if(saved)setLanguage(saved)}catch{}}
export function useLanguage(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn)}},getLanguage,()=> 'en' as Language);}
export function tr(text:string,values:Record<string,unknown>={}){const row=(catalogue as Record<string,string[]>)[text];let translated=current==='en'||!row?text:row[['zh-Hant','de','fr','ja'].indexOf(current)]||text;for(const [k,v]of Object.entries(values))translated=translated.replaceAll('{'+k+'}',String(v));return translated;}
export function localizedTime(seconds=0){const n=Math.abs(seconds),m=Math.floor(n/60);return (seconds<0?'−':'')+[new Intl.NumberFormat(current,{style:'unit',unit:'hour',unitDisplay:'short'}).format(Math.floor(m/60)),new Intl.NumberFormat(current,{style:'unit',unit:'minute',unitDisplay:'short'}).format(m%60),...(n%60?[new Intl.NumberFormat(current,{style:'unit',unit:'second',unitDisplay:'short'}).format(n%60)]:[])].join(' ');}
export function translateNotification(text:string){
 const matched=text.match(/^(.*): Matched with (.*)\. Confirm when you are ready to begin\.$/);if(matched)return matched[1]+': '+tr('Matched with {name}. Confirm when you are ready to begin.',{name:matched[2]});
 const message=text.match(/^(.*): New message from (.*)$/);if(message)return message[1]+': '+tr('New message from {name}',{name:message[2]});
 for(const key of Object.keys(catalogue)){if(text.endsWith(': '+key))return text.slice(0,-key.length)+tr(key);}return text;
}
