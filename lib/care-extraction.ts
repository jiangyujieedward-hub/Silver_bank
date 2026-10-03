import {z} from 'zod';
const output=z.object({reply:z.string().trim().min(1).max(5000),topic:z.enum(['physical','emotional','mixed','other','uncertain']),physicalQuotes:z.array(z.string().min(1).max(1600)).max(6)}).strict();
// Classification describes message content, never the user's health or a diagnosis.
export function parseCareReply(raw:string,userText:string){
 const result=output.parse(JSON.parse(raw));
 if(result.physicalQuotes.some(q=>!q.trim()||!userText.includes(q)))throw new Error('Ungrounded quote');
 const quotes=[...new Set(result.physicalQuotes)];
 if(quotes.join('\n\n').length>1600)throw new Error('Excessive extraction');
 if(!['physical','mixed'].includes(result.topic)&&quotes.length)throw new Error('Inconsistent extraction');
 return {...result,physicalQuotes:quotes};
}
