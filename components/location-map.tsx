'use client';
import React,{useState} from 'react';
import {Geolocation} from '@capacitor/geolocation';
import {Capacitor} from '@capacitor/core';
import {Button} from './ui/button';
import {MapPin} from 'lucide-react';
import {tr,useLanguage} from '@/lib/i18n';
import {mapLinks} from '@/lib/location';

// Current position is deliberately transient, never submitted with profile data.
export function LocationMap({area=''}:{area?:string}){
 useLanguage();
 const [position,setPosition]=useState<{latitude:number;longitude:number;accuracy:number}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function locate(){
  setBusy(true);setError('');
  try{
   let coords:{latitude:number;longitude:number;accuracy:number};
   if(Capacitor.isNativePlatform()){
    const current=await Geolocation.checkPermissions();
    if(current.location==='prompt'||current.coarseLocation==='prompt')await Geolocation.requestPermissions({permissions:['location','coarseLocation']});
    const p=await Geolocation.getCurrentPosition({enableHighAccuracy:false,timeout:20000,maximumAge:60000});coords=p.coords;
   }else{
    if(!navigator.geolocation)throw Object.assign(new Error('unsupported'),{code:'unsupported'});
    if(!window.isSecureContext&&!['localhost','127.0.0.1'].includes(location.hostname))throw Object.assign(new Error('insecure'),{code:'insecure'});
    coords=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve(p.coords),reject,{enableHighAccuracy:false,timeout:20000,maximumAge:60000}));
   }
   mapLinks(coords.latitude,coords.longitude);setPosition(coords);
  }
  catch(e:any){setError(e?.code===1||e?.code==='OS-PLUG-GLOC-0003'?'Location access was denied. Allow location in your device settings, or enter your service area above.':e?.code==='insecure'?'Current location needs a secure connection. Open the published app, or enter your service area manually.':e?.code==='unsupported'?'This browser cannot provide a current location. Enter your service area manually.':'Your location could not be found. Check that location services are on and try again, or enter your service area above.');}
  finally{setBusy(false);}
 }
 const links=position?mapLinks(position.latitude,position.longitude):null;
 return <section className="location-map" aria-label={tr('Current location map')}>
  <Button type="button" variant="outline" onClick={locate} disabled={busy}><MapPin/>{tr(busy?'Finding your location…':'Use my current location')}</Button>
  <p className="hint">{tr('Show your position using OpenStreetMap. Your location is sent to the map provider to display the map, but is not saved in your profile or shared with members.')}</p>
  {error&&<p role="alert" className="error">{tr(error)}</p>}
  {area&&<a className="area-map-link" href={'https://www.openstreetmap.org/search?query='+encodeURIComponent(area)} target="_blank" rel="noopener noreferrer"><MapPin/>{tr('Open service area map')}</a>}
  {links&&<><iframe title={tr('Current location map')} src={links.embed} referrerPolicy="strict-origin-when-cross-origin" loading="lazy"/><p role="status">{tr('The pin shows your current position. Enter your town or neighbourhood in the service area field above, then save your profile.')}</p><a href={links.full} target="_blank" rel="noopener noreferrer">{tr('Open larger map')}</a><Button type="button" variant="ghost" onClick={()=>setPosition(null)}>{tr('Hide map')}</Button></>}
 </section>;
}
