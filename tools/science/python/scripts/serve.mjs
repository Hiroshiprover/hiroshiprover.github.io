// Local static preview only; deliberately bind loopback rather than all interfaces.
import http from 'node:http';
import handler from 'serve-handler';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base='/python-lab/',port=4177;
const server=http.createServer(async(req,res)=>{
 if(!req.url?.startsWith(base)){res.writeHead(302,{Location:base});res.end();return;}
 req.url='/'+req.url.slice(base.length);
 try{await handler(req,res,{public:resolve(root,'build'),cleanUrls:true,trailingSlash:true,directoryListing:false})}
 catch{res.statusCode=500;res.end('Static preview failed');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Static Python lab: http://127.0.0.1:${port}${base}`));
