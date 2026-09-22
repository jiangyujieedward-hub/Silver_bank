// Store only bounded numeric strokes, never uploaded HTML or SVG markup.
export function validateSignature(value:unknown):string {
 if(typeof value!=='string'||value.length>80000)throw new Error('Please add your handwritten signature.');
 let strokes:any;try{strokes=JSON.parse(value)}catch{throw new Error('Please add your handwritten signature.')}
 if(!Array.isArray(strokes)||!strokes.length||strokes.length>100)throw new Error('Please add your handwritten signature.');
 let count=0,minX=1000,maxX=0,minY=300,maxY=0;
 for(const stroke of strokes){if(!Array.isArray(stroke)||!stroke.length)throw new Error('Invalid signature. Please clear and sign again.');for(const p of stroke){if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>1000||p[1]<0||p[1]>300)throw new Error('Invalid signature. Please clear and sign again.');count++;minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);}}
 if(count<3||count>3000||Math.max(maxX-minX,maxY-minY)<10)throw new Error('Please add your handwritten signature.');
 return JSON.stringify(strokes);
}
