// Node-only verification: no Python, notebook kernels, or scientific packages in site builds.
import {readFile,lstat} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=b=>createHash('sha256').update(b).digest('hex');
async function safeRead(rel){const path=resolve(root,rel);if(!path.startsWith(root+sep)||rel.split(/[\\/]/).includes('..'))throw Error('Unsafe generated path');let p=path;while(p!==root){if((await lstat(p)).isSymbolicLink())throw Error('Symlink forbidden');p=dirname(p);}return readFile(path)}
export async function check(){
 const m=JSON.parse(await safeRead('generated/manifest.json'));if(m.schemaVersion!==1||!/^generated\/[a-f0-9]{20}\/$/.test(m.artifactBase))throw Error('Invalid manifest');
 const inputs={};for(const key of Object.keys(m.inputs).sort()){inputs[key]=sha(await safeRead(key));if(inputs[key]!==m.inputs[key])throw Error('Stale generation: '+key);}
 const required=['python/bands.py','python/parameters.json','notebooks/two-band.ipynb','requirements.in','requirements.lock','scripts/generate.py'].sort();if(JSON.stringify(Object.keys(inputs))!==JSON.stringify(required))throw Error('Incomplete generation inputs');
 if(sha(JSON.stringify(inputs))!==m.inputHash)throw Error('Input fingerprint mismatch');
 for(const [name,hash] of Object.entries(m.outputs)){if(sha(await safeRead('static/'+m.artifactBase+name))!==hash)throw Error('Corrupt artifact: '+name);}
 if(sha(await safeRead('docs/notebook.md'))!==m.notebookDocSha256)throw Error('Generated notebook markdown changed');
 console.log(`Verified ${Object.keys(m.outputs).length} generated files and notebook article; no Python executed`);return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await check();
