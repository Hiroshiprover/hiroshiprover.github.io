import {createServer} from 'node:http';import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE);const browserPath=()=>process.env.BROWSER_EXECUTABLE;
const root=resolve('build');const server=createServer(async(req,res)=>{try{let p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!p.startsWith(root+sep)&&p!==root)throw Error();if((await stat(p)).isDirectory())p=resolve(p,'index.html');const data=await readFile(p);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'})[extname(p)]||'application/octet-stream');res.end(data)}catch{res.statusCode=404;res.end('Not found')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({executablePath:browserPath(),headless:true});const checks=[],errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));await mkdir('qa/search',{recursive:true});
 for(const locale of ['', 'en/']) {
  const prefix='/'+locale;
  const catalog=await (await page.request.get(base+prefix+'search-data/catalog.json')).json();
  assert(catalog.length>30);assert(catalog.every(d=>d.url.startsWith(prefix)&&!d.url.includes('/content/')));
  for(const doc of catalog)assert.equal((await page.request.get(base+doc.url)).status(),200,doc.url);
  await page.goto(base+prefix+'search/');await page.waitForFunction(()=>document.querySelectorAll('.result').length>20);
  await page.locator('.site-search aside nav button').nth(3).click();await page.waitForFunction(()=>document.querySelectorAll('.result').length===10);assert((await page.locator('.section-label').allTextContents()).every(t=>t===(locale?'PROJECT':'项目')));await page.getByRole('button',{name:locale?'Reset filters':'重置筛选',exact:true}).click();
  const input=page.getByRole('combobox');await input.fill(locale?'quantum':'量子');await page.waitForTimeout(1200);assert(await page.locator('.result').count()>0);
  assert(!(await page.getByRole('alert').count()));assert((await page.locator('.result-meta').first().innerText()).includes(locale?'Title match':'标题命中'));
  for(const link of await page.locator('.sub-results a').evaluateAll(es=>es.map(e=>e.href))) {
   const u=new URL(link);const html=await (await page.request.get(link)).text();const $=require('cheerio').load(html);assert($('[id]').toArray().some(e=>$(e).attr('id')===decodeURIComponent(u.hash.slice(1))),link);
  }
  checks.push(locale+'catalog/routes/title-ranking/full-text/anchors/section-filter');
  // The original prototype contract ranks title matches before section/full-text matches.
  const matches=await page.evaluate(async prefix=>{
   const api=await import(prefix+'search-data/pagefind/all/pagefind.js');
   const result=await api.search(null,{filters:{tag:['Physics','Optics']}});
   return await Promise.all(result.results.map(async r=>(await r.data()).meta.docId));
  },prefix);
  const expected=catalog.filter(d=>['Physics','Optics'].every(t=>d.tags.includes(t))).map(d=>d.id).sort();assert.deepEqual(matches.sort(),expected);
  checks.push(locale+'tag-AND');
  await input.fill('龘靐齉');await page.waitForTimeout(700);await page.getByText(locale?'No matching notes yet':'没有找到匹配的笔记',{exact:true}).waitFor();
  await page.getByRole('button',{name:locale?'Show all articles':'查看全部文章',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.result').length>20);
  await input.fill('#Phy');await page.locator('#tag-suggestions').waitFor();await input.press('ArrowDown');await input.press('Escape');assert.equal(await page.locator('#tag-suggestions').count(),0);
  await input.fill('#Physics');await input.press('Enter');await page.waitForTimeout(500);assert.equal(await page.locator('.chips .selected').count(),1);
  await input.fill('');await input.press('Backspace');assert.equal(await page.locator('.chips .selected').count(),0);
  await input.dispatchEvent('compositionstart');await input.fill('量');await input.press('Enter');assert.equal(await input.inputValue(),'量');await input.dispatchEvent('compositionend',{data:'量'});
  await page.getByRole('button',{name:locale?'Reset filters':'重置筛选',exact:true}).click();
  await input.fill(locale?'electron':'光学');await input.fill(locale?'quantum':'量子');await page.waitForTimeout(900);assert(await page.locator('.result').count()>0);
  checks.push(locale+'empty/reset/tag-keyboard/IME/rapid-search');
 }
 await page.goto(base+'/search/');await page.waitForFunction(()=>document.querySelectorAll('.result').length>20);await page.screenshot({path:'qa/search/desktop.png',fullPage:false});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));await page.waitForTimeout(400);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'qa/search/mobile-dark.png',fullPage:false});checks.push('responsive/dark');
 // Catalog failure must show an actionable retry, then recover without reload.
 await page.route('**/search-data/catalog.json',r=>r.fulfill({status:503,body:'unavailable'}));await page.goto(base+'/search/');await page.getByRole('alert').waitFor();await page.unroute('**/search-data/catalog.json');await page.getByRole('button',{name:'重试',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.result').length>20);checks.push('catalog-failure/retry');
 assert.deepEqual(errors,[]);await writeFile('qa/search/browser.json',JSON.stringify({checks,errors},null,2));console.log('PASS',checks);
}finally {await browser.close();await new Promise(r=>server.close(r));}
