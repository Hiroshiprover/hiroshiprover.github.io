// Explicit author action only; never called by start/build/deploy.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {check} from '../tools/science/python/scripts/check-generated.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),py=resolve(root,'tools/science/python'),tex=resolve(root,'tools/science/tex');
const sha=b=>createHash('sha256').update(b).digest('hex');
const m=await check(),copies=[];
for(const [name,hash] of Object.entries(m.outputs)){const rel='static/'+m.artifactBase+name;copies.push([resolve(py,rel),resolve(root,rel),hash]);}
const figures=JSON.parse(await readFile(resolve(tex,'public/img/figures/manifest.json')));
for(const f of figures.figures){if(!/^img\/figures\/[a-z0-9-]+\.svg$/.test(f.url))throw Error('Invalid figure path');copies.push([resolve(tex,'public',f.url),resolve(root,'static',f.url),f.sha256]);}
// Validate all bytes before changing published copies. Build guard catches interrupted sync.
for(const [src,,hash] of copies)if(sha(await readFile(src))!==hash)throw Error('Invalid artifact: '+src);
for(const [src,dst] of copies){await mkdir(dirname(dst),{recursive:true});await copyFile(src,dst);}
await writeFile(resolve(root,'src/pages/science/notebook.md'),(await readFile(resolve(py,'docs/notebook.md'),'utf8')).replaceAll('../static/','../../../static/'));
await writeFile(resolve(root,'src/components/Science/bands-source.json'),JSON.stringify(await readFile(resolve(py,'python/bands.py'),'utf8')));
console.log('Published science copies refreshed. Run the site build to verify input fingerprints.');
