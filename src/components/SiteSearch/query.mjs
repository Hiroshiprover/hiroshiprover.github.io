export function extractTags(input,available){
 const tags=[];let unknown=[];
 const query=input.replace(/#"([^"\n]+)"|#([^\s#"]+)/g,(raw,quoted,simple)=>{const value=quoted||simple;const exact=available.find(t=>t.toLowerCase()===value.toLowerCase());if(exact){tags.push(exact);return '';}unknown.push(raw);return raw;}).replace(/\s+/g,' ').trim();
 return {query,tags:[...new Set(tags)],unknown};
}
export function suggestionFragment(input){const m=input.match(/(?:^|\s)#([^#]*)$/);return m?m[1].replace(/^"/,''):null;}
export function stripSuggestion(input){return input.replace(/(^|\s)#[^#]*$/,'').trim();}
