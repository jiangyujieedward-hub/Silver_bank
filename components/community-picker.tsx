'use client';
import React,{useState} from 'react';
import {countries,regions,cities,communityLabel,parseCommunity} from '@/lib/communities';
import {NativeSelect} from './ui/native-select';
import {tr,useLanguage} from '@/lib/i18n';
export function CommunityPicker({value='',onChange,required=true}:{value?:string,onChange?:(value:string)=>void,required?:boolean}){
 const [selection,setSelection]=useState(()=>parseCommunity(value));const language=useLanguage();const names=new Intl.DisplayNames([language],{type:'region'});
 const states=regions(selection.country),towns=cities(selection.country,selection.state);const label=communityLabel(selection.country,selection.state,selection.city);
 function choose(next:typeof selection){setSelection(next);onChange?.(communityLabel(next.country,next.state,next.city));}
 return <div className="community-picker"><input type="hidden" name="location" value={label}/><label className="field"><span>{tr('Country / territory')}</span><NativeSelect required={required} value={selection.country} onChange={e=>choose({country:e.target.value,state:'',city:''})}><option value="">{tr('Choose a country')}</option>{countries.map(c=><option key={c.isoCode} value={c.isoCode}>{c.flag} {names.of(c.isoCode)||c.name}</option>)}</NativeSelect></label>{states.length>0&&<label className="field"><span>{tr('State / region')}</span><NativeSelect required={required} value={selection.state} onChange={e=>choose({...selection,state:e.target.value,city:''})}><option value="">{tr('Choose a region')}</option>{states.map(s=><option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}</NativeSelect></label>}{(!states.length||selection.state)&&towns.length>0&&<label className="field"><span>{tr('City / community')}</span><NativeSelect required={required} value={selection.city} onChange={e=>choose({...selection,city:e.target.value})}><option value="">{tr('Choose a community')}</option>{Array.from(new Set(towns.map(c=>c.name))).map(c=><option key={c} value={c}>{c}</option>)}</NativeSelect></label>}</div>;
}
