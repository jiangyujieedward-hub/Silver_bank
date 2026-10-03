'use client';
// Adapted from the user-supplied React Bits CurvedLoop (JS + CSS).
import {useRef,useEffect,useState,useMemo,useId} from 'react';
import {useReducedMotion} from 'motion/react';
import './CurvedLoop.css';
export default function CurvedLoop({marqueeText='',speed=2,className='',curveAmount=0,direction='left',interactive=true,paused=false}:{marqueeText?:string;speed?:number;className?:string;curveAmount?:number;direction?:'left'|'right';interactive?:boolean;paused?:boolean}){
 const text=useMemo(()=>marqueeText.trim()+'\u00a0\u00a0\u00a0',[marqueeText]);const measureRef=useRef<SVGTextElement>(null),textPathRef=useRef<SVGTextPathElement>(null);const [spacing,setSpacing]=useState(0);const uid=useId().replace(/:/g,'');const pathId='curve-'+uid;const drag=useRef(false),lastX=useRef(0),dir=useRef(direction),velocity=useRef(0),offset=useRef(0);const reduced=useReducedMotion();const still=paused||reduced;
 useEffect(()=>{let active=true;const measure=()=>{if(active&&measureRef.current)setSpacing(measureRef.current.getComputedTextLength())};measure();document.fonts.ready.then(measure);return()=>{active=false}},[text,className]);
 const move=(delta:number)=>{if(!spacing)return;offset.current=((offset.current+delta)%spacing-spacing)%spacing;textPathRef.current?.setAttribute('startOffset',String(offset.current));};
 useEffect(()=>{offset.current=-spacing;textPathRef.current?.setAttribute('startOffset',String(-spacing))},[spacing]);
 useEffect(()=>{if(!spacing||still)return;let frame=0,last=0;const step=(time:number)=>{const dt=last?Math.min(time-last,50):16.67;last=time;if(!drag.current)move((dir.current==='right'?1:-1)*speed*dt/16.67);frame=requestAnimationFrame(step)};frame=requestAnimationFrame(step);return()=>cancelAnimationFrame(frame)},[spacing,speed,still]);
 const total=spacing?Array(Math.ceil(2000/spacing)+3).fill(text).join(''):text;
 return <div className={'curved-loop-jacket '+className} aria-label={marqueeText.replaceAll('✦',',')} onPointerDown={e=>{if(!interactive||still)return;drag.current=true;lastX.current=e.clientX;velocity.current=0;e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(!drag.current||still)return;const delta=e.clientX-lastX.current;lastX.current=e.clientX;velocity.current=delta;move(delta*1440/e.currentTarget.clientWidth)}} onPointerUp={()=>{drag.current=false;dir.current=velocity.current>0?'right':'left'}} onPointerCancel={()=>{drag.current=false}}>
 {still?<p className="loop-static">{marqueeText}</p>:<svg aria-hidden="true" className="curved-loop-svg" viewBox="0 0 1440 100"><text ref={measureRef} xmlSpace="preserve" style={{visibility:'hidden'}}>{text}</text><defs><path id={pathId} d={`M-100,65 Q500,${65+curveAmount} 1540,65`}/></defs>{spacing>0&&<text xmlSpace="preserve"><textPath ref={textPathRef} href={'#'+pathId} startOffset={-spacing}>{total}</textPath></text>}</svg>}
 </div>
}
