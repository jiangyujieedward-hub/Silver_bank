// Navigation preferences are hints only; account and Care setup remain server-backed.
export function entryRoute(hash:string,signedIn:boolean,returning:boolean,preferred='home'){
 const dashboard=preferred==='care/overview'?'care/overview':'home';
 if(signedIn)return !hash||['intro','login','join'].includes(hash)?dashboard:hash;
 if(hash==='intro')return 'intro';
 if(hash==='join')return 'join';
 return hash|| (returning?'login':'intro');
}
