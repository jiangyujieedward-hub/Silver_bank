export function validatePhoto(value:unknown):string|null{
 if(value===undefined||value===null||value==='')return null;
 if(typeof value!=='string'||value.length>810000)throw new Error('Photo is too large. Choose a smaller photo.');
 const match=value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);if(!match)throw new Error('Choose a JPEG, PNG or WebP photo.');
 let bytes:string;try{bytes=atob(match[2])}catch{throw new Error('Invalid photo. Please choose another image.')}
 const jpeg=bytes.startsWith('\xff\xd8\xff')&&bytes.endsWith('\xff\xd9'),png=bytes.startsWith('\x89PNG\r\n\x1a\n'),webp=bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP';
 if(bytes.length>600000||!(match[1]==='jpeg'?jpeg:match[1]==='png'?png:webp))throw new Error('Invalid photo. Please choose another image.');return value;
}
