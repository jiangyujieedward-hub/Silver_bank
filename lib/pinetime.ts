// Mastro PineTime / InfiniTime GATT contract, reviewed at Mastro_OS 27f5cb3.
export const MOTION_SERVICE='00030000-78fc-48fe-8e23-433b3a1942d0';
export const STEP_CHARACTERISTIC='00030001-78fc-48fe-8e23-433b3a1942d0';
export function heartRate(value:DataView){
 if(value.byteLength<2)return null;
 const flags=value.getUint8(0);if((flags&4)&&!(flags&2))return null;
 if((flags&1)&&value.byteLength<3)return null;
 const bpm=flags&1?value.getUint16(1,true):value.getUint8(1);
 return bpm>0&&bpm<=400?bpm:null;
}
export function stepCount(value:DataView){return value.byteLength===4&&value.getUint32(0,true)<=200000?value.getUint32(0,true):null}
