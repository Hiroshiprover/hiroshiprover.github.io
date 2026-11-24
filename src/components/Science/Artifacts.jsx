import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import CodeBlock from '@theme/CodeBlock';
import manifest from '@site/tools/science/python/generated/manifest.json';
import source from './bands-source.json';
export function GeneratedFigure(){return <figure><div className="lab-figure"><img src={useBaseUrl(manifest.artifactBase+'bands.svg')} alt="质量参数 m 为 0.60 的两条对称能带，在布里渊区边界保留 0.8 的能隙" width="720" height="440"/></div><figcaption className="lab-caption">NumPy / SciPy 求解本征值，Matplotlib 生成静态图。上、下能带关于零能对称，m = 0.60 时最小能隙为 0.80。</figcaption></figure>}
export function Downloads(){const base=useBaseUrl(manifest.artifactBase);return <div className="download-row">{['bands.py','parameters.json','bands.svg','bands.png','bands.json','two-band.ipynb'].map(name=><a key={name} href={base+name+(name.endsWith('.ipynb')?'.json':'')} download={name}>{name}</a>)}</div>}
export function PythonSource(){return <CodeBlock language="python" title="python/bands.py">{source}</CodeBlock>}
