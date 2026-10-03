'use client';
import {useState} from 'react';
import FlipCard from './react-bits/FlipCard';
import AccordionGallery from './react-bits/AccordionGallery';
const bankItems=[
 {image:'/images/landing/pottery.jpg',label:'Find a match',alt:'An older mentor shares pottery skills with a younger adult'},
 {image:'/images/landing/conversation.jpg',label:'Agree and take part',alt:'Two generations talking together at a table'},
 {image:'/images/landing/gardening.jpg',label:'Give and receive',alt:'An older adult and children gardening together'}
];
export function BankSolutions(){return <><AccordionGallery items={bankItems} defaultIndex={2} expandRatio={0.52} trigger="hover" height={430} grayscale={false} tilt={3} className="sp-bank-gallery"/><ol className="sp-gallery-steps"><li><strong>Find a match</strong><span>Offer a skill or ask for everyday help.</span></li><li><strong>Agree and take part</strong><span>Choose a time and confirm together.</span></li><li><strong>Give and receive</strong><span>Confirm completion and exchange Time Credit.</span></li></ol></>}
const careItems=[
 {title:'A conversation that stays with you',text:'Talk naturally. Physical concerns can become editable notes in My Health.',image:'conversation.jpg',alt:'An older adult in a conversation at home'},
 {title:'A clearer personal record',text:'Keep your own words, track changes and prepare for appointments.',image:'pottery.jpg',alt:'An older adult sharing a practical skill'},
 {title:'Family within reach',text:'Keep trusted contacts close and open a call with one tap.',image:'family.jpg',alt:'A grandmother spending time with her grandchildren'}
];
export function CareSolutions(){
 const [step,setStep]=useState(-1),[front,setFront]=useState(-1),[back,setBack]=useState(0);
 const face=(i:number)=>i<0?<div className="sp-flip-content"><img src="/images/landing/family.jpg" alt="A grandmother and her grandchildren" loading="lazy"/><div><span>Three ways to feel connected</span><h3>Care, in your everyday life.</h3><p>Tap to explore</p></div></div>:<div className="sp-flip-content"><img src={'/images/landing/'+careItems[i].image} alt={careItems[i].alt} loading="lazy"/><div><span>0{i+1} / 03</span><h3>{careItems[i].title}</h3><p>{careItems[i].text}</p></div></div>;
 return <div className="sp-care-flip"><FlipCard front={face(front)} back={face(back)} axis="y" flipOnClick draggable dragDistance={0} tilt tiltMax={12} glare glareOpacity={0.22} hoverScale={1.03} perspective={1100} stiffness={170} damping={20} width={520} height={460} radius={22} background="#27272a" color="#f5f5f5" shadow shadowColor="#000000" shadowOpacity={0.45} ariaLabel={step<0?'Explore Silver Care solutions':careItems[step].title+'. Show next solution'} onFlipChange={(flipped:boolean)=>{const next=(step+1)%3;setStep(next);if(flipped)setBack(next);else setFront(next)}}/><p className="sp-flip-hint" aria-live="polite">{step<0?'Tap, drag or press Enter':`${step+1} of 3 · ${careItems[step].title}`}<span>Tap again for the next idea</span></p></div>
}
