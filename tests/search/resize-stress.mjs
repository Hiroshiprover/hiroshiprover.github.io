import {createServer} from 'node:http';import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE);const browserPath=()=>process.env.BROWSER_EXECUTABLE;
const root=resolve('build');const server=createServer(async(req,res)=>{try{let p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!p.startsWith(root+sep)&&p!==root)throw Error();if((await stat(p)).isDirectory())p=resolve(p,'index.html');const data=await readFile(p);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'})[extname(p)]||'application/octet-stream');res.end(data)}catch{res.statusCode=404;res.end('Not found')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({executablePath:browserPath(),headless:true});const checks=[];const errors=[];

try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on("pageerror",e=>{errors.push({url:page.url(),stack:e.stack});console.log("PAGEERROR",page.url(),e.stack)});
 if(process.env.GUARD_PROBE) throw Error('Response rewrites are forbidden in the persistent-patch regression');
 const paths=["science/","science/notebook/","en/science/","en/science/notebook/"];
 for(let i=0;i<80;i++){
  await page.goto(base+"/"+paths[i%paths.length],{waitUntil:"domcontentloaded"});
  await page.setViewportSize({width:i%2?390:1280,height:844});
  if(process.env.NATIVE_ONLY!=="1") await page.evaluate(()=>{for(let j=0;j<8;j++)setTimeout(()=>window.dispatchEvent(new Event("resize")),j*4)});
  await page.waitForTimeout(90);
 }
 await writeFile('qa/search/resize-'+(process.env.NATIVE_ONLY==='1'?'native':'mixed')+'.json',JSON.stringify({runs:80,errors},null,2));
 assert.deepEqual(errors,[], 'Every pageerror must fail the resize stress test');
 console.log("RESULT",JSON.stringify({runs:80,errors}));
}finally{await browser.close();await new Promise(r=>server.close(r))}
