'use client';
import React,{useState} from 'react';
import {MultiSelect,MultiSelectTrigger,MultiSelectValue,MultiSelectInput,MultiSelectContent,MultiSelectList,MultiSelectItem,MultiSelectEmpty} from '../motion/multi-select';
import {tr} from '@/lib/i18n';
export function MultipleChoice({options,value,onChange,name,defaultValue=[],label}:{options:{value:string,label:string}[],value?:string[],onChange?:(v:string[])=>void,name?:string,defaultValue?:string[],label:string}){
 const [internal,setInternal]=useState(defaultValue);const selected=value??internal;
 const all=[...options,...selected.filter(v=>!options.some(o=>o.value===v)).map(v=>({value:v,label:v}))];
 return <div className="field silver-multi"><span>{label}</span>{name&&<input type="hidden" name={name} value={selected.join(', ')}/>}<MultiSelect value={selected} onValueChange={v=>{setInternal(v);onChange?.(v)}}><MultiSelectTrigger><MultiSelectValue placeholder=""/><MultiSelectInput aria-label={label} placeholder={tr('Choose options')}/></MultiSelectTrigger><MultiSelectContent><MultiSelectList>{all.map(o=><MultiSelectItem key={o.value} value={o.value}>{o.label}</MultiSelectItem>)}<MultiSelectEmpty>{tr('No results')}</MultiSelectEmpty></MultiSelectList></MultiSelectContent></MultiSelect></div>;
}
