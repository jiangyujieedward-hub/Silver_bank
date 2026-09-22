import {Capacitor,registerPlugin} from '@capacitor/core';
export const isNative=()=>Capacitor.isNativePlatform();
const secure=registerPlugin<{get():Promise<{value?:string}>;set(v:{value:string}):Promise<void>;remove():Promise<void>;copy(v:{value:string}):Promise<void>}>('SecureSession');
export async function nativeToken(){return isNative()?(await secure.get()).value:undefined;}
export async function saveNativeToken(value:string){if(isNative())await secure.set({value});}
export async function clearNativeToken(){if(isNative())await secure.remove();}
export async function copyNativeRecovery(value:string){await secure.copy({value});}
