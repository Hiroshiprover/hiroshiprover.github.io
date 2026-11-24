const {test}=require('node:test');const assert=require('node:assert/strict');
const {collect,isPublic}=require('../../plugins/site-search/index.cjs');
test('Exclude draft, unlisted, opt-out, staging and editor records',()=>{
 for(const meta of [{draft:true},{unlisted:true},{frontMatter:{draft:true}},{frontMatter:{unlisted:true}},{frontMatter:{staging:true}},{frontMatter:{search:false}},...['@site/docs/staging/x.mdx','@site/.dsh-live-editor/x.mdx','@site/docs/drafts/x.md','@site/docs/preview/x.md'].map(source=>({source}))]) assert.equal(isPublic(meta),false,JSON.stringify(meta));
 assert.equal(isPublic({source:'@site/docs/01-why-qft.mdx',frontMatter:{slug:'/custom'}}),true);
});
test('Metadata retains plugin routes, translated paths and tag labels without source-filename guessing',()=>{
 const docs=collect({'docusaurus-plugin-content-docs':{default:{loadedVersions:[{docs:[{title:'Title',permalink:'/en/docs/custom',source:'@site/i18n/en/01-file.mdx',tags:[{label:'Physics'}]}]}]},proj:{loadedVersions:[{docs:[{permalink:'/en/proj/fallback'}]}]}},'docusaurus-plugin-content-blog':{default:{blogPosts:[{metadata:{permalink:'/en/blog/Real_SLUG'}}]}},'docusaurus-plugin-content-pages':{default:[{type:'jsx',permalink:'/en/search/'},{type:'mdx',permalink:'/en/science/'}]}});
 assert.deepEqual(docs.map(d=>[d.permalink,d.section]),[['/en/docs/custom','docs'],['/en/proj/fallback','proj'],['/en/blog/Real_SLUG','blog'],['/en/science/','pages']]);assert.deepEqual(docs[0].tags,[{label:'Physics'}]);
});

test('Permalink and source reserved segments are excluded, including encoded/mixed-case locale routes',()=>{
 for(const permalink of ['/staging/secret','/en/docs/STAGING/secret','/en/%73taging/secret','/en/preview','/docs/drafts/secret','/docs/a%2Fstaging%2Fb','/en/.dsh-live-editor/doc','/_staging/x'])assert.equal(isPublic({source:'@site/docs/public.mdx',permalink}),false,permalink);
 assert.equal(isPublic({source:'@site\\docs\\staging\\x.mdx',permalink:'/docs/public'}),false);
});
test('Normal article words, query strings, anchors and percent escapes are not mistaken for reserved segments',()=>{
 for(const permalink of ['/docs/staging-the-experiment','/docs/preview-of-qft','/docs/draftsmanship','/docs/redraft','/docs/public?next=/staging/x','/docs/public#preview','/docs/staging-area','/docs/%E9%87%8F%E5%AD%90','/docs/100%25'])assert.equal(isPublic({source:'@site/docs/public.mdx',permalink}),true,permalink);
 for(const source of ['@site/docs/staging-the-experiment.mdx','@site/docs/preview-of-qft.mdx','@site/docs/draftsmanship.mdx'])assert.equal(isPublic({source,permalink:'/docs/public'}),true,source);
 assert.equal(isPublic({source:'@site/docs/real.mdx',permalink:'/en/proj/real',frontMatter:{draft:false,unlisted:false,staging:false,search:true}}),true);
});
test('Every robots meta is checked case-insensitively using directive tokens, not substrings',()=>{
 const cheerio=require('cheerio');const {hasNoIndex}=require('../../plugins/site-search/index.cjs');
 for(const html of ['<meta name="robots" content="index,follow"><meta NAME="Robots" CONTENT="NoIndex, FOLLOW">','<meta name=" ROBOTS " content="  NOINDEX  nofollow ">','<meta name="robots" content="NONE">'])assert.equal(hasNoIndex(cheerio.load(html)),true,html);
 for(const html of ['','<meta name="robots" content="index,follow">','<meta name="description" content="noindex">','<meta name="robots" content="not-noindex,noindexable,nonetheless">','<meta name="robots"><meta name="robots" content="max-snippet:0">'])assert.equal(hasNoIndex(cheerio.load(html)),false,html);
});
test('Package and lockfile Node minimum cover the added HTML parser',()=>{
 const pkg=require('../../package.json'),lock=require('../../package-lock.json');
 assert.equal(pkg.engines.node,'>=20.18.1');assert.equal(lock.packages[''].engines.node,pkg.engines.node);
 const semver=require('semver');assert(semver.satisfies(semver.minVersion(pkg.engines.node),require('cheerio/package.json').engines.node));
});
test('Real postBuild indexes only eligible rendered pages and respects locale URLs',async()=>{
 const fs=require('node:fs/promises'),path=require('node:path');const plugin=require('../../plugins/site-search/index.cjs');
 const outDir=await fs.mkdtemp(path.resolve('qa/search/fixture-'));
 try {
  const records=[
   {permalink:'/en/docs/public',title:'Published',tags:[{label:'Physics'}]},
   {permalink:'/en/docs/staging-the-experiment',title:'Valid article'},
   {permalink:'/en/docs/private-robots',title:'Private robots'},
   {permalink:'/en/staging/private',title:'Private route'},
   {permalink:'/en/docs/draft-record',title:'Draft',draft:true},
   {permalink:'/en/docs/unlisted-record',title:'Unlisted',unlisted:true},
   {permalink:'/en/docs/optout-record',title:'Opt out',frontMatter:{search:false}},
  ];
  for(const record of records.slice(0,3)){
   const dir=path.join(outDir,record.permalink.slice('/en/'.length));await fs.mkdir(dir,{recursive:true});
   const robots=record.title==='Private robots'?'<meta name="robots" content="index"><meta name="ROBOTS" content="NOINDEX,follow">':'';
   await fs.writeFile(path.join(dir,'index.html'),`<html><head>${robots}</head><body><main><article><div class="markdown"><h1>${record.title}</h1><h2 id="real-anchor">Known heading</h2><p>Known public content.</p></div></article></main></body></html>`);
  }
  const instance=plugin({i18n:{currentLocale:'en'}});await instance.allContentLoaded({allContent:{'docusaurus-plugin-content-docs':{default:{loadedVersions:[{docs:records}]}}}});await instance.postBuild({outDir,baseUrl:'/en/'});
  const catalog=JSON.parse(await fs.readFile(path.join(outDir,'search-data/catalog.json')));
  assert.deepEqual(catalog.map(d=>d.url),['/en/docs/public','/en/docs/staging-the-experiment']);assert.deepEqual(catalog[0].tags,['Physics']);
  for(const lane of ['all','title','heading'])assert((await fs.stat(path.join(outDir,'search-data/pagefind',lane,'pagefind.js'))).isFile());
 } finally {await fs.rm(outDir,{recursive:true,force:true});}
});
