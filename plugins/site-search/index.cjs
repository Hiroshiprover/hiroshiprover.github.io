const fs = require('node:fs/promises');
const path = require('node:path');
const cheerio = require('cheerio');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Match reserved path segments, not article-title substrings. URL query/hash
// values must not hide an otherwise public article. Decode encoded segments.
const privateSegments = new Set(['.dsh-live-editor', '_staging', 'staging', 'draft', 'drafts', 'preview']);
function hasPrivatePath(value, isUrl=false) {
  let pathname=String(value || '');
  if(isUrl) pathname=new URL(pathname, 'https://site.invalid').pathname;
  try { pathname=decodeURIComponent(pathname); } catch { /* Preserve malformed escapes for normal route validation. */ }
  return pathname.split(/[\\/]/).some(segment=>privateSegments.has(segment.toLowerCase()));
}
function isPublic(meta) {
  const fm = meta.frontMatter || {};
  return ![meta.draft, meta.unlisted, fm.draft, fm.unlisted, fm.staging].some(Boolean)
    && fm.search !== false && !hasPrivatePath(meta.source) && !hasPrivatePath(meta.permalink, true);
}
function hasNoIndex($) {
  return $('meta').toArray().some(element=>{
    const meta=$(element);
    if((meta.attr('name') || '').trim().toLowerCase() !== 'robots') return false;
    const directives=(meta.attr('content') || '').toLowerCase().split(/[,\s]+/);
    return directives.includes('noindex') || directives.includes('none');
  });
}
function collect(allContent) {
  const result=[];
  for(const [id, content] of Object.entries(allContent['docusaurus-plugin-content-docs'] || {}))
    for(const version of content.loadedVersions || []) for(const meta of version.docs || []) result.push({...meta, section:id==='proj'?'proj':'docs'});
  for(const content of Object.values(allContent['docusaurus-plugin-content-blog'] || {}))
    for(const post of content.blogPosts || []) result.push({...post.metadata, section:'blog'});
  for(const content of Object.values(allContent['docusaurus-plugin-content-pages'] || {}))
    for(const meta of content || []) if(meta.type==='mdx') result.push({...meta, section:'pages'});
  return result.filter(isPublic);
}
module.exports = context => {
  let metadata=[];
  return {
    name:'site-search',
    async allContentLoaded({allContent}) { metadata=collect(allContent); },
    async postBuild({outDir,baseUrl}) {
      const pagefind=await import('pagefind');
      const docs=[];
      for(const meta of metadata) {
        if(!meta.permalink.startsWith(baseUrl)) throw Error('Search route outside locale base: '+meta.permalink);
        const relative=decodeURIComponent(meta.permalink.slice(baseUrl.length)).replace(/^\/+|\/+$/g,'');
        const htmlPath=path.resolve(outDir,relative,'index.html');
        if(!htmlPath.startsWith(path.resolve(outDir)+path.sep)) throw Error('Unsafe search route');
        const $=cheerio.load(await fs.readFile(htmlPath,'utf8'));
        if(hasNoIndex($)) continue;
        const body=$(meta.section==='pages'?'main article':'article .markdown, main .markdown').first().clone();
        if(!body.length) throw Error('Missing searchable article: '+meta.permalink);
        body.find('.katex').each((_,e)=>$(e).replaceWith($('<span>').text($(e).find('annotation').text())));
        body.find('script,style,button,.hash-link,.theme-code-block-highlighted-line-number').remove();
        const sections=[{id:'',title:meta.title,paragraphs:[]}];
        body.find('h1,h2,h3,h4,h5,h6,p,pre,li,td,th,figcaption').each((_,e)=>{
          const el=$(e);if(el.parents('li,pre,td,th').length)return;
          const text=el.text().replace(/\s+/g,' ').trim();if(!text)return;
          if(/^h[1-6]$/.test(e.tagName)){if(e.tagName!=='h1')sections.push({id:el.attr('id')||'',title:text,paragraphs:[]});}
          else sections.at(-1).paragraphs.push(text);
        });
        docs.push({id:meta.permalink,lang:context.i18n.currentLocale,title:meta.title,url:meta.permalink,section:meta.section,
          tags:[...new Set((meta.tags||[]).map(t=>typeof t==='string'?t:t.label))],description:meta.description||'',sections});
      }
      const target=path.join(outDir,'search-data');
      await fs.mkdir(target,{recursive:true});
      try {
        for(const lane of ['all','title','heading']) {
          const {index}=await pagefind.createIndex({forceLanguage:context.i18n.currentLocale==='zh'?'zh-CN':context.i18n.currentLocale});
          if(!index)throw Error('Could not create Pagefind index');
          try {
            for(const d of docs) {
              const content=lane==='title'?`<h1>${esc(d.title)}</h1>`:lane==='heading'?d.sections.slice(1).map(s=>`<h2 ${s.id?`id="${esc(s.id)}"`:""}>${esc(s.title)}</h2>`).join(''):`<h1>${esc(d.title)}</h1>`+d.sections.map((s,i)=>`${i?`<h2 ${s.id?`id="${esc(s.id)}"`:""}>${esc(s.title)}</h2>`:''}${s.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}`).join('');
              if(!content)continue;
              const meta=`<meta data-pagefind-meta="docId[content]" content="${esc(d.id)}"><meta data-pagefind-meta="title[content]" content="${esc(d.title)}">`+[...d.tags.map(t=>['tag',t]),['section',d.section]].map(([k,v])=>`<meta data-pagefind-filter="${k}[content]" content="${esc(v)}">`).join('');
              const result=await index.addHTMLFile({url:d.url,content:`<!doctype html><html lang="${d.lang}"><head>${meta}</head><body><article data-pagefind-body>${content}</article></body></html>`});
              if(result.errors?.length)throw Error(result.errors.join('\n'));
            }
            const result=await index.writeFiles({outputPath:path.join(target,'pagefind',lane)});
            if(result.errors?.length)throw Error(result.errors.join('\n'));
          } finally { await index.deleteIndex(); }
        }
      } finally { await pagefind.close(); }
      await fs.writeFile(path.join(target,'catalog.json'),JSON.stringify(docs.map(({sections,...d})=>d)));
      console.log(`Search indexed ${docs.length} ${context.i18n.currentLocale} published articles from Docusaurus metadata`);
    },
  };
};
module.exports.collect=collect;
module.exports.isPublic=isPublic;

module.exports.hasNoIndex=hasNoIndex;
