import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {HeartHandshake,ShoppingBag,Package,PawPrint,Flower2,Monitor,House,Languages,BookOpen,Users} from 'lucide-react';
import {localizedTime} from '@/lib/i18n';
const icons:Record<string,any>={'Shopping and errands':ShoppingBag,'Parcel collection':Package,'Pet care':PawPrint,'Plant care':Flower2,'Technology assistance':Monitor,'Household help':House,'Language practice':Languages,'Teaching and skills exchange':BookOpen,'Companionship':Users,'Community assistance':HeartHandshake};
export const taskIcon=(category:string)=>icons[category]||HeartHandshake;
export const taskTone=(id:string)=>Array.from(String(id)).reduce((n,c)=>n+c.charCodeAt(0),0)%4;
export const cardColours=['#d6edf1','#ffd6cc','#e4dcfa','#e8efbf'];
export async function taskCardImage(task:any){
 const canvas=document.createElement('canvas');canvas.width=700;canvas.height=900;const c=canvas.getContext('2d');if(!c)throw Error('Canvas unavailable');
 await document.fonts.load('bold 44px "Google Sans"');
 c.fillStyle=cardColours[taskTone(task.category_id)];c.fillRect(0,0,700,900);
 c.fillStyle='#182b43';c.font='bold 44px "Google Sans", sans-serif';c.textAlign='center';c.textBaseline='top';
 const lines:string[]=[];let line='';for(const char of Array.from(String(task.title))){if(c.measureText(line+char).width>600){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);
 lines.slice(0,3).forEach((text,index)=>c.fillText(index===2&&lines.length>3?text.slice(0,-1)+'…':text,350,44+index*54));
 const Icon=taskIcon(task.category);const svg=renderToStaticMarkup(<Icon width={440} height={440} color="#294e72" strokeWidth={1.2}/>);
 const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=reject;image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)});
 c.drawImage(image,120,240,460,460);
 c.fillStyle='#182b43';c.font='bold 42px "Google Sans", sans-serif';c.textBaseline='middle';c.fillText(localizedTime(task.estimated_seconds),350,813,610);
 return canvas.toDataURL('image/png');
}
