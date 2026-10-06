'use client';
import {useEffect,useRef,useState} from 'react';
import {Bluetooth,Heart,Footprints} from 'lucide-react';
import {Button} from './ui/button';
import {MOTION_SERVICE,STEP_CHARACTERISTIC,heartRate,stepCount} from '@/lib/pinetime';
type Reading={id:string;kind:string;value:number;unit:string;measuredAt:string};
export function PineTimeConnect({api,onSaved}:any){
 const [supported,setSupported]=useState(false),[connecting,setConnecting]=useState(false),[connected,setConnected]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[values,setValues]=useState<Record<string,Reading>>({});
 const device=useRef<any>(null),cleanup=useRef<(()=>void)[]>([]),generation=useRef(0),alive=useRef(true),adapter=useRef<any>(null),savedIds=useRef(new Set<string>());
 useEffect(()=>{alive.current=true;setSupported(!!(navigator as any).bluetooth&&window.isSecureContext);return()=>{alive.current=false;generation.current++;cleanup.current.forEach(f=>f());device.current?.gatt?.disconnect()}},[]);
 function stop(){generation.current++;cleanup.current.forEach(f=>f());cleanup.current=[];device.current?.gatt?.disconnect();device.current=null;setConnected(false);setConnecting(false);setValues({});setStatus('Bluetooth disconnected. Saved records remain in My Health.')}
 async function connect(){
  setError('');setStatus('Choose your PineTime in the Bluetooth window.');setConnecting(true);setValues({});savedIds.current.clear();const g=++generation.current;
  const current=()=>alive.current&&generation.current===g;
  let selected:any;
  try{
   selected=await (navigator as any).bluetooth.requestDevice({filters:[{namePrefix:'InfiniTime'},{namePrefix:'PineTime'},{namePrefix:'Mastro'},{services:['heart_rate']}],optionalServices:['heart_rate',MOTION_SERVICE]});
   if(!current())return;if(adapter.current?.deviceId!==selected.id)adapter.current=null;device.current=selected;
   const disconnected=()=>{if(current()){stop();setStatus('Watch disconnected. Keep it nearby and connect again.')}};
   selected.addEventListener('gattserverdisconnected',disconnected);cleanup.current.push(()=>selected.removeEventListener('gattserverdisconnected',disconnected));
   const server=await selected.gatt.connect();if(!current()){selected.gatt.disconnect();return}
   let count=0;const unavailable:string[]=[];
   for(const [kind,serviceId,charId,parse,unit] of [['heart_rate','heart_rate','heart_rate_measurement',heartRate,'bpm'],['steps',MOTION_SERVICE,STEP_CHARACTERISTIC,stepCount,'steps']] as const){
    try{
     const service=await server.getPrimaryService(serviceId),characteristic=await service.getCharacteristic(charId);
     if(!current())return;
     const receive=(v:DataView)=>{if(!current())return;const value=parse(v);setValues(old=>{const next={...old};if(value===null){delete next[kind];return next}next[kind]={id:crypto.randomUUID(),kind,value,unit,measuredAt:new Date().toISOString()};return next})};
     const listener=(e:any)=>receive(e.target.value);
     await characteristic.startNotifications();if(!current())return;
     characteristic.addEventListener('characteristicvaluechanged',listener);cleanup.current.push(()=>characteristic.removeEventListener('characteristicvaluechanged',listener));
     // Initial heart-rate reads may contain an old value. Only new notifications count.
     if(kind==='steps')try{receive(await characteristic.readValue())}catch{/* Wait for notification. */}
     count++;
    }catch{unavailable.push(kind==='steps'?'steps':'heart rate')}
   }
   if(!current())return;if(!count)throw Error('No supported readings found. Check that Mastro PineTime or InfiniTime firmware is installed.');
   setConnected(true);setStatus(unavailable.length?'Connected. '+unavailable.join(' and ')+' unavailable on this firmware.':'Connected. Open SilverCare on your watch and start a heart-rate reading.');
  }catch(e:any){if(current()){cleanup.current.forEach(f=>f());cleanup.current=[];selected?.gatt?.disconnect();device.current=null;setConnected(false);setStatus('');setError(e.name==='NotFoundError'?'No watch selected. Wake the watch and try again.':e.name==='NotAllowedError'?'Allow Chrome Bluetooth access in macOS System Settings → Privacy & Security → Bluetooth.':e.message||'Could not connect. Close other watch apps and try again.')}}finally{if(current())setConnecting(false)}
 }
 async function save(){
  const readings=Object.values(values).filter(r=>!savedIds.current.has(r.id)&&Date.now()-Date.parse(r.measuredAt)<120000);if(!readings.length){setError('Wait for a new reading before saving.');return}
  setSaving(true);setError('');try{
   if(!adapter.current)adapter.current={...await api('care/connect',{name:'PineTime · Mac Bluetooth',permissions:['heart_rate','steps']}),deviceId:device.current?.id};
   const response=await fetch('/api/care-device',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'CareDevice '+adapter.current.token},body:JSON.stringify({measurements:readings})});
   const result=await response.json() as {error?:string};if(!response.ok)throw Error(result.error||'Could not save readings.');
   readings.forEach(r=>savedIds.current.add(r.id));if(alive.current){setStatus('Saved to My Health.');try{await onSaved?.()}catch{setError('Readings saved. Refresh My Health to see them.')}}
  }catch(e:any){if(alive.current)setError(e.message)}finally{if(alive.current)setSaving(false)}
 }
 return <section className="care-card"><Bluetooth size={32}/><h2>Connect your PineTime</h2><p>Use Chrome on your Mac. Wake your watch, keep it nearby and close other apps connected to it.</p>{!supported&&<p className="care-empty">Open this page in Google Chrome on your Mac to connect by Bluetooth.</p>}<div className="care-actions"><Button disabled={!supported||connecting||connected||saving} onClick={connect}>{connecting?'Connecting…':'Connect PineTime'}</Button>{(connected||connecting)&&<Button variant="outline" disabled={saving} onClick={stop}>Disconnect Bluetooth</Button>}</div>{status&&<p role="status">{status}</p>}{error&&<p className="error" role="alert">{error}</p>}{connected&&<><div className="care-grid"><div><Heart/><h3>Heart rate</h3><p>{values.heart_rate?values.heart_rate.value+' bpm':'Waiting for a new reading…'}</p>{values.heart_rate&&<small>Received {new Date(values.heart_rate.measuredAt).toLocaleTimeString()}</small>}</div><div><Footprints/><h3>Steps</h3><p>{values.steps?values.steps.value+' steps':'Waiting for a reading…'}</p>{values.steps&&<small>Received {new Date(values.steps.measuredAt).toLocaleTimeString()}</small>}</div></div><p className="care-muted">These are watch-reported readings. Times show when your Mac received them. Steps are the watch’s current counter, not a new amount to add.</p><Button disabled={saving||!Object.keys(values).length} onClick={save}>{saving?'Saving…':'Save readings to My Health'}</Button><p className="care-muted">Saving sends heart rate and steps to your private Silver Care records. Keep this page open to receive new readings. The watch’s Help button does not contact anyone.</p></>}</section>
}
