"use client";
import Dock from './Dock';
import {useReducedMotion} from 'motion/react';
export function ActionDock({items,label,className=''}:{items:any[],label:string,className?:string}){const reduced=useReducedMotion();return <Dock inline items={items} label={label} className={className} baseItemSize={50} magnification={reduced?50:54} panelHeight={68}/>}
