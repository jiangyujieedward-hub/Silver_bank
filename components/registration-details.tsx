'use client';
import React,{useState} from 'react';
import {Input} from './silver/input';
import {NativeSelect} from './silver/select';
import {CommunityPicker} from './community-picker';
import {SignaturePad} from './signature-pad';
import {countryCallingOptions,countryFlag,splitPhone} from '@/lib/phone';
import {tr,useLanguage,setLanguage} from '@/lib/i18n';
import policies from '@/lib/policies.json';
export const languageChoices=[['zh-Hant','繁體中文'],['en','English'],['de','Deutsch'],['fr','Français'],['ja','日本語']];
export function RegistrationDetails({user,hideAge=false}:any){const language=useLanguage();const [location,setLocation]=useState(user?.location||'');const initial=splitPhone(user?.phone||'');const [code,setCode]=useState(initial.code);const [phone,setPhone]=useState(initial.number);const regionNames=new Intl.DisplayNames([language],{type:'region'});return <>
 <CommunityPicker value={location} onChange={setLocation}/>
 <div className="phone-fields"><label className="field"><span>{tr("Country calling code")}</span><NativeSelect name="countryCode" value={code} onChange={e=>setCode(e.target.value)} required autoComplete="tel-country-code"><option value="">{tr("Choose a code")}</option>{countryCallingOptions.map(c=><option key={c.country} value={c.code}>{c.code} {countryFlag(c.country)} — {regionNames.of(c.country)}</option>)}</NativeSelect></label><label className="field"><span>{tr("Phone number")}</span><Input name="phoneNumber" type="tel" inputMode="tel" required maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel-national"/></label></div>
 <label className="field"><span>{tr("Preferred language")}</span><NativeSelect name="language" value={language} onChange={e=>setLanguage(e.target.value)} required>{languageChoices.map(([v,t])=><option key={v} value={v}>{t}</option>)}</NativeSelect></label>
 {!hideAge&&<label className="field"><span>{tr("Age range")}</span><NativeSelect name="ageBand" defaultValue={user?.age_band||''} required><option value="">{tr("Choose your age range")}</option><option value="under18">{tr("Under 18")}</option>{['18-24','25-34','35-44','45-54','55-64','65-74'].map(v=><option key={v} value={v}>{v}</option>)}<option value="75plus">{tr("75 or older")}</option></NativeSelect></label>}

 </>}
export function AgreementFields({task=false,name=''}:{task?:boolean;name?:string}){return <section className="agreements"><h3>{task?tr("Before you begin"):tr("Community agreements")}</h3>{policies.filter(p=>!task||p.kind==='private').map(p=><div key={p.kind}><details><summary>{tr(p.title)}</summary><div className="agreement-text" lang="en">{p.content}</div></details><input type="hidden" name={p.kind+'Version'} value={p.version}/><label className="consent-check"><input type="checkbox" name={p.kind+'Agreed'} required/><span>{tr("I have read and agree to the")} {tr(p.title)}.</span></label></div>)}{task&&<label className="consent-check"><input type="checkbox" name="taskUnderstood" required/><span>{tr("I understand the task I am accepting.")}</span></label>}<label className="field"><span>{tr("Your full name")}</span><Input name="signature" required maxLength={100} defaultValue="" autoComplete="name"/></label><SignaturePad/><a href="https://neighbour-time-bank.edward24122009.chatgpt.site/guidelines/silver-care-guidelines.pdf" target="_blank" rel="noreferrer">{tr("Read the original guidelines PDF")}</a></section>}
