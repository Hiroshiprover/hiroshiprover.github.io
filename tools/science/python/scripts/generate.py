"""Explicit local author workflow. Build uses check-generated.mjs and never executes Python."""
from pathlib import Path
import os,sys,json,hashlib,tempfile,subprocess,shutil,fcntl,platform,importlib.metadata,re
ROOT=Path(__file__).resolve().parents[1]
INPUTS=['python/bands.py','python/parameters.json','notebooks/two-band.ipynb','requirements.in','requirements.lock','scripts/generate.py']
def sha(data):return hashlib.sha256(data).hexdigest()
def safe(root,rel):
    p=root/rel
    if Path(rel).is_absolute() or '..' in Path(rel).parts:raise ValueError('Unsafe path')
    for part in [p,*p.parents]:
        if part==root:break
        if part.is_symlink():raise ValueError('Symlink not allowed')
    if not p.resolve().is_relative_to(root.resolve()):raise ValueError('Outside project')
    return p
def input_hashes(root):return {p:sha(safe(root,p).read_bytes()) for p in sorted(INPUTS)}
def validate_notebook(nb):
    # Limited static subset; deliberately no arbitrary HTML/JS/widgets/raw cells.
    for c in nb.cells:
        if c.cell_type not in ['markdown','code']:raise ValueError('Unsupported notebook cell type')
        if c.cell_type=='markdown' and re.search(r'<\s*/?\w+|!\[[^\]]*\]\((?:https?:|data:)',c.source):raise ValueError('Notebook raw HTML/remote images unsupported')
        for o in c.get('outputs',[]):
            if o.output_type=='error':raise ValueError('Notebook contains failed cell')
            if o.output_type not in ['stream','display_data','execute_result']:raise ValueError('Unsupported notebook output')
            if set(o.get('data',{}))-{'text/plain','image/png','text/latex'}:raise ValueError('Rich HTML/JS/widget output unsupported')

def generate(root=ROOT):
    for line in (root/'requirements.lock').read_text().splitlines():
        name,version=line.split('==')
        if importlib.metadata.version(name)!=version:raise RuntimeError('Python environment differs from lock: '+name)
    hashes=input_hashes(root)
    cache=safe(root,'.cache');cache.mkdir(exist_ok=True)
    with safe(root,'.cache/generation.lock').open('w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        with tempfile.TemporaryDirectory(prefix='python-lab-',dir=cache) as name:
            work=Path(name).resolve();assets=work/'assets';assets.mkdir()
            env={k:v for k,v in os.environ.items() if k in ['PATH','LANG','LC_ALL','SYSTEMROOT']}
            env.update({'MPLBACKEND':'Agg','MPLCONFIGDIR':str(work/'mpl'),'PYTHONHASHSEED':'0','SOURCE_DATE_EPOCH':'1700000000','IPYTHONDIR':str(work/'ipython'),'JUPYTER_CONFIG_DIR':str(work/'jupyter-config'),'JUPYTER_RUNTIME_DIR':str(work/'runtime')})
            process=subprocess.run([sys.executable,str(root/'python/bands.py'),'--output',str(assets)],cwd=work,env=env,capture_output=True,text=True,timeout=60)
            if process.returncode:raise RuntimeError('Model generation failed\n'+process.stderr[-3000:])
            import nbformat
            from nbclient import NotebookClient
            from nbconvert import MarkdownExporter
            from jupyter_client.manager import AsyncKernelManager
            from jupyter_client.kernelspec import KernelSpecManager
            kernels=work/'kernels';(kernels/'python3').mkdir(parents=True)
            (kernels/'python3/kernel.json').write_text(json.dumps({'argv':[sys.executable,'-m','ipykernel_launcher','-f','{connection_file}'],'display_name':'Python Science Lab','language':'python'}))
            class LocalKernelManager(AsyncKernelManager):
                def __init__(self,**kwargs):super().__init__(kernel_spec_manager=KernelSpecManager(kernel_dirs=[str(kernels)]),**kwargs)
            nb=nbformat.read(root/'notebooks/two-band.ipynb',as_version=4);validate_notebook(nb)
            client=NotebookClient(nb,timeout=30,allow_errors=False,record_timing=False,kernel_name='python3',kernel_manager_class=LocalKernelManager)
            client.execute(cwd=str(assets),env=env)
            validate_notebook(nb)
            # Execution timing is disabled; IDs come from committed input, not random generation.
            nbformat.write(nb,assets/'two-band.ipynb.json')
            exporter=MarkdownExporter();body,resources=exporter.from_notebook_node(nb,resources={'unique_key':'two-band','output_files_dir':'notebook-assets'})
            for rel,data in resources.get('outputs',{}).items():
                p=safe(assets,rel);p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
            shutil.copyfile(root/'python/bands.py',assets/'bands.py');shutil.copyfile(root/'python/parameters.json',assets/'parameters.json')
            output_hashes={str(p.relative_to(assets)):sha(p.read_bytes()) for p in sorted(assets.rglob('*')) if p.is_file()}
            bundle=sha(json.dumps(output_hashes,sort_keys=True,separators=(',',':')).encode())[:20]
            for rel in resources.get('outputs',{}):body=body.replace(']('+rel+')','](../static/generated/'+bundle+'/'+rel+')')
            notebook_doc='---\ntitle: Notebook 静态文章\nsidebar_label: Notebook 静态文章\nmdx:\n  format: md\n---\n\n'+body+'\n'
            if input_hashes(root)!=hashes:raise RuntimeError('Inputs changed during generation')
            destination=safe(root,'static/generated/'+bundle);destination.parent.mkdir(parents=True,exist_ok=True)
            if destination.exists():
                actual={str(p.relative_to(destination)):sha(p.read_bytes()) for p in destination.rglob('*') if p.is_file()}
                if actual!=output_hashes:raise RuntimeError('Existing bundle differs')
            else:shutil.copytree(assets,destination)
            result={'schemaVersion':1,'inputHash':sha(json.dumps(hashes,sort_keys=True,separators=(',',':')).encode()),'inputs':hashes,'artifactBase':'generated/'+bundle+'/','outputs':output_hashes,'notebookDocSha256':sha(notebook_doc.encode()),'environment':{'python':platform.python_version(),'numpy':importlib.metadata.version('numpy'),'scipy':importlib.metadata.version('scipy'),'matplotlib':importlib.metadata.version('matplotlib'),'nbconvert':importlib.metadata.version('nbconvert')}}
            docs=safe(root,'docs/notebook.md');manifest=safe(root,'generated/manifest.json');manifest.parent.mkdir(exist_ok=True)
            old_doc=docs.read_bytes() if docs.exists() else None
            try:
                temp_doc=safe(root,'docs/notebook.next.md');temp_doc.write_text(notebook_doc);os.replace(temp_doc,docs)
                temp_manifest=safe(root,'generated/manifest.next.json');temp_manifest.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');os.replace(temp_manifest,manifest)
            except Exception:
                if old_doc is not None:docs.write_bytes(old_doc)
                elif docs.exists():docs.unlink()
                raise
            print(process.stdout.strip());print(f'Notebook executed and converted with nbconvert; published {len(output_hashes)} files in {bundle}')
            return result
if __name__=='__main__':generate()
