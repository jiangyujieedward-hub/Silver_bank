'use client';
import React,{useRef,useState} from 'react';
import {Input as MotionInput} from '../motion/input';
import {Input as PlainInput} from '../ui/input';
import {DateWheelInput} from './date-wheel';
// Preserve the app's native form events, validation, autofill and file inputs.
export function Input(props:React.ComponentProps<'input'>){
 if(['date','datetime-local'].includes(props.type||''))return <DateWheelInput {...props}/>;
 if(['file','hidden','checkbox','radio'].includes(props.type||''))return <PlainInput {...props}/>;
 return <AnimatedInput {...props}/>;
}
function AnimatedInput({onChange,onInvalid,onInput,ref,className,...props}:React.ComponentProps<'input'>){
 const [invalid,setInvalid]=useState(false);
 return <MotionInput {...props} ref={ref} value={props.value===undefined?undefined:String(props.value)} defaultValue={props.defaultValue===undefined?undefined:String(props.defaultValue)} className={'silver-input '+(className||'')} classNames={{field:'silver-input-field',input:'silver-input-native'}} error={invalid||props['aria-invalid']===true} onNativeChange={onChange} onInvalid={e=>{setInvalid(true);onInvalid?.(e)}} onInput={e=>{if(e.currentTarget.validity.valid)setInvalid(false);onInput?.(e)}}/>;
}
