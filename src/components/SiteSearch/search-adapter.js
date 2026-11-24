// UI contract: search({query,tags,section,base}) -> article results.
// Only this adapter knows Pagefind's bundle layout and result format.
const modules=new Map();
async function engine(base,lane){const key=`${base}search-data/pagefind/${lane}/pagefind.js`;if(!modules.has(key))modules.set(key,import(/* webpackIgnore: true */ key).then(async api=>{await api.options({baseUrl:"/"});return api;}).catch(e=>{modules.delete(key);throw e;}));return modules.get(key);}
export async function search({query,tags,section,base}){
 const filters={...(tags.length?{tag:tags}:{}),...(section!=='all'?{section}: {})};
 const lanes=query.trim()?['title','heading','all']:['all'];
 const batches=await Promise.all(lanes.map(async lane=>{
  const api=await engine(base,lane);const res=await api.search(query.trim()||null,{filters});
  return Promise.all(res.results.map(async hit=>({...await hit.data(),lane})));
 }));
 const merged=new Map();
 for(const batch of batches)for(const hit of batch){const id=hit.meta.docId;if(!merged.has(id))merged.set(id,hit);else if(hit.lane==='all'){const prior=merged.get(id);merged.set(id,{...hit,lane:prior.lane});}}
 return [...merged.values()].map(hit=>({id:hit.meta.docId,lane:hit.lane,excerpt:hit.excerpt,subResults:(hit.sub_results||[]).filter(s=>s.url.includes('#')).slice(0,3)}));
}
