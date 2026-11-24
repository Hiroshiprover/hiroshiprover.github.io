const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {pathToFileURL}=require('node:url');
const sha=b=>createHash('sha256').update(b).digest('hex');
module.exports=function(context){return {name:'science-artifacts',async loadContent(){
 const root=context.siteDir,py=path.join(root,'tools/science/python'),tex=path.join(root,'tools/science/tex');
 const safe=async(base,rel)=>{const p=path.resolve(base,rel);if(!p.startsWith(base+path.sep)||rel.split(/[\\/]/).includes('..'))throw Error('Unsafe science path');for(let q=p;q!==base;q=path.dirname(q))if((await fs.lstat(q)).isSymbolicLink())throw Error('Science symlink forbidden');return fs.readFile(p)};
 const {check}=await import(pathToFileURL(path.join(py,'scripts/check-generated.mjs')).href);const m=await check();
 for(const [name,hash] of Object.entries(m.outputs))if(sha(await safe(root,'static/'+m.artifactBase+name))!==hash)throw Error('Published Python artifact changed: '+name);
 if(sha((await safe(root,'src/pages/science/notebook.md')).toString().replaceAll('../../../static/','../static/'))!==m.notebookDocSha256)throw Error('Published notebook changed');
 const source=JSON.parse(await safe(root,'src/components/Science/bands-source.json'));if(sha(source)!==m.inputs['python/bands.py'])throw Error('Published source changed');
 const spec=JSON.parse(await safe(tex,'diagrams/manifest.json'));const generated=JSON.parse(await safe(tex,'public/img/figures/manifest.json'));
 const inputs=['diagrams/manifest.json','diagrams/toolchain.lock.json','scripts/diagrams.py',...spec.inputs.map(x=>'diagrams/'+x),...spec.figures.map(x=>'diagrams/'+x.source)];
 const hashes={};for(const name of [...new Set(inputs)].sort())hashes[name]=sha(await safe(tex,name));
 // Match Python json.dumps(sort_keys=True) separators used by the TeX generator.
 const fingerprint=sha('{'+Object.entries(hashes).map(([k,v])=>JSON.stringify(k)+': '+JSON.stringify(v)).join(', ')+'}');
 if(fingerprint!==generated.inputHash)throw Error('Stale TikZ source');
 if(JSON.stringify(spec.figures.map(f=>f.id))!==JSON.stringify(generated.figures.map(f=>f.id)))throw Error('TikZ figure set changed');
 for(const f of generated.figures){if(sha(await safe(tex,'public/'+f.url))!==f.sha256||sha(await safe(root,'static/'+f.url))!==f.sha256)throw Error('Corrupt TikZ figure: '+f.id)}
 console.log('Science integration verified: Python/Notebook and 3 TikZ figures; no generators executed');
}}};
