import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {HeartHandshake,ShoppingBag,Package,PawPrint,Flower2,Monitor,House,Languages,BookOpen,Users} from 'lucide-react';
import {localizedTime} from '@/lib/i18n';
const icons:Record<string,any>={'Shopping and errands':ShoppingBag,'Parcel collection':Package,'Pet care':PawPrint,'Plant care':Flower2,'Technology assistance':Monitor,'Household help':House,'Language practice':Languages,'Teaching and skills exchange':BookOpen,'Companionship':Users,'Community assistance':HeartHandshake};
export const taskIcon=(category:string)=>icons[category]||HeartHandshake;
export const taskTone=(id:string)=>Array.from(String(id)).reduce((n,c)=>n+c.charCodeAt(0),0)%4;
export const cardColours=['#e8edef','#e4e7eb','#ecebee','#e8edec'];
export const taskPhoto=(category:string)=>({'Pet care':'/images/tasks/dog-walking.jpg','Plant care':'/images/tasks/plant-care.jpg','Shopping and errands':'/images/tasks/grocery-help.jpg'} as Record<string,string>)[category];
export async function taskCardImage(task:any){
 const canvas=document.createElement('canvas');canvas.width=700;canvas.height=900;const c=canvas.getContext('2d');if(!c)throw Error('Canvas unavailable');
 await document.fonts.load('bold 44px "Google Sans"');
 c.fillStyle=cardColours[taskTone(task.category_id)];c.fillRect(0,0,700,900);
 c.fillStyle='#182b43';c.font='bold 44px "Google Sans", sans-serif';c.textAlign='center';c.textBaseline='top';
 const lines:string[]=[];let line='';for(const char of Array.from(String(task.title))){if(c.measureText(line+char).width>600){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);
 lines.slice(0,3).forEach((text,index)=>c.fillText(index===2&&lines.length>3?text.slice(0,-1)+'…':text,350,44+index*54));
 const photo=taskPhoto(task.category);
 if(photo){const img=new Image();try{await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=reject;img.src=photo});const top=210,height=520,width=636,x=32;const scale=Math.max(width/img.width,height/img.height);c.save();c.beginPath();c.roundRect(x,top,width,height,24);c.clip();c.drawImage(img,x+(width-img.width*scale)/2,top+(height-img.height*scale)/2,img.width*scale,img.height*scale);c.restore();}catch{}}
 const Icon=taskIcon(task.category);const svg=renderToStaticMarkup(<Icon width={440} height={440} color="#294e72" strokeWidth={1.2}/>);
 const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=reject;image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)});
 if(!photo)c.drawImage(image,120,240,460,460);
 c.fillStyle='#182b43';c.font='bold 42px "Google Sans", sans-serif';c.textBaseline='middle';c.fillText(localizedTime(task.estimated_seconds),350,813,610);
 return canvas.toDataURL('image/png');
}
