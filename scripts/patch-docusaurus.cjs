// Deliberately fail closed on a version/source change; review or retire the patch on upgrade.
const fs=require('node:fs');const path=require('node:path');const {createHash}=require('node:crypto');
const spec=require('../patches/docusaurus-theme-common-3.10.1.json');
const sha=value=>createHash('sha256').update(value).digest('hex');
function applyPatch(root=path.resolve(__dirname,'..')) {
 const packageRoot=path.join(root,'node_modules',spec.package);
 const installed=JSON.parse(fs.readFileSync(path.join(packageRoot,'package.json'),'utf8'));
 if(installed.name!==spec.package||installed.version!==spec.version)throw Error(`Dependency patch requires ${spec.package}@${spec.version}; found ${installed.name}@${installed.version}. Review or retire the patch before upgrading.`);
 const updates=[];
 // Validate every target before modifying any target.
 for(const file of spec.files) {
  const target=path.join(packageRoot,file.path);let content=fs.readFileSync(target,'utf8');const hash=sha(content);
  if(hash===file.patchedSha256)continue;
  if(hash!==file.originalSha256)throw Error(`Dependency patch refuses unknown content: ${file.path}`);
  for(const replacement of file.replacements) {
   if(content.split(replacement.before).length!==2)throw Error(`Patch anchor is not unique: ${file.path}`);
   content=content.replace(replacement.before,replacement.after);
  }
  if(sha(content)!==file.patchedSha256)throw Error(`Patched hash mismatch: ${file.path}`);
  updates.push({target,content});
 }
 for(const {target,content} of updates)fs.writeFileSync(target,content);
 console.log(`Verified ${spec.package}@${spec.version} lifecycle patch (${updates.length} files applied)`);
 return updates.length;
}
if(require.main===module)applyPatch();
module.exports={applyPatch};
