import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import manifest from '@site/tools/science/tex/public/img/figures/manifest.json';
function Figure({figure}) {const url=useBaseUrl(figure.url);return <figure><h2>{figure.title}</h2><div className="lab-figure"><img src={url} alt={figure.caption} /></div><figcaption>{figure.caption}</figcaption><a href={url} download>下载 SVG</a></figure>}
export default function Figures(){return <>{manifest.figures.map(figure=><Figure key={figure.id} figure={figure}/>)}</>}
