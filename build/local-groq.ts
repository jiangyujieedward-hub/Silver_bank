// Development-only transport. Authentication and usage limits remain in the Worker.
import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fetch,ProxyAgent} from 'undici';
export async function localGroq(){
 let proxy=process.env.HTTPS_PROXY||process.env.https_proxy;
 if(!proxy&&process.platform==='darwin'){
  try{const settings=execFileSync('/usr/sbin/scutil',['--proxy'],{encoding:'utf8',timeout:2000});
   const host=settings.match(/HTTPSProxy\s*:\s*(\S+)/)?.[1],port=settings.match(/HTTPSPort\s*:\s*(\d+)/)?.[1];
   if(/HTTPSEnable\s*:\s*1/.test(settings)&&host&&port)proxy=`http://${host}:${port}`;
  }catch{/* Direct transport remains available without a system proxy. */}
 }
 if(!proxy)return null;
 const dispatcher=new ProxyAgent(proxy),token=randomBytes(32).toString('hex');
 const server=createServer(async(req,res)=>{
  const supplied=Buffer.from(String(req.headers['x-local-transport']||''));
  if(req.method!=='POST'||req.url!=='/'||supplied.length!==token.length||!timingSafeEqual(supplied,Buffer.from(token))){res.writeHead(403).end();return;}
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>64000){res.writeHead(413).end();return;}}
   const upstream=await fetch('https://api.groq.com/openai/v1/chat/completions',{dispatcher,method:'POST',headers:{Authorization:String(req.headers.authorization||''),'Content-Type':'application/json'},body,signal:AbortSignal.timeout(18000)});
   res.writeHead(upstream.status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(await upstream.text());
  }catch{res.writeHead(502).end('{"error":"Provider connection unavailable"}');}
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const address=server.address();if(!address||typeof address==='string')throw Error('Local transport failed');
 return {vars:{LOCAL_GROQ_URL:`http://127.0.0.1:${address.port}/`,LOCAL_GROQ_TOKEN:token},close(){server.close();void dispatcher.close();}};
}
