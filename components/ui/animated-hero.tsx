'use client';
import CurvedLoop from '../CurvedLoop';
import {useEffect,useState} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {ArrowUpRight,ArrowDown} from 'lucide-react';
import {Button} from './button';
// Adapted from the animated hero supplied with the Silver⁺ brief.
export function Hero({onStart,onExplore,paused=false}:{onStart:()=>void;onExplore:()=>void;paused?:boolean}){
 const words=['connected.','independent.','involved.'];const [index,setIndex]=useState(0);const reduced=useReducedMotion();
 useEffect(()=>{if(paused||reduced)return;const id=setInterval(()=>setIndex(i=>(i+1)%words.length),3200);return()=>clearInterval(id)},[paused,reduced]);
 return <section className="sp-hero" aria-labelledby="sp-hero-title"><div className="sp-hero-copy"><p className="sp-eyebrow">A little time. A fuller life.</p><h1 id="sp-hero-title">Live well.<br/>Stay <span className="sp-changing" aria-hidden="true">{words.map((word,i)=><motion.span key={word} initial={false} animate={{y:i===index?'0%':i<index?'-115%':'115%',opacity:i===index?1:0}} transition={{duration:reduced||paused?0:.65,ease:[.22,1,.36,1]}}>{word}</motion.span>)}</span><span className="sr-only">connected, independent and involved.</span></h1><p className="sp-lead">Your experience matters. Your wellbeing matters. Silver⁺ brings community time-sharing and everyday health support together.</p><div className="sp-actions"><Button onClick={onStart}>Get Started <ArrowUpRight size={20}/></Button><Button variant="ghost" onClick={onExplore}>Explore Silver⁺ <ArrowDown size={18}/></Button></div></div><div className="sp-hero-photo"><img src="/images/landing/community-garden.png" alt="Older and younger community members sharing gardening skills" fetchPriority="high"/><div className="sp-photo-caption"><span>Good company.<br/>Something to share.</span><span className="sp-photo-plus" aria-hidden="true">+</span></div></div><div className="sp-hero-foot"><CurvedLoop marqueeText="Wellbeing ✦ Meaningful participation ✦ Across generations ✦" curveAmount={0} speed={.7} interactive paused={paused}/></div></section>
}
