"""Trusted local generation, sandboxed TeX, tool-free verification. Python stdlib only."""
from pathlib import Path
import argparse, hashlib, json, os, shutil, subprocess, tempfile, time, signal, resource, re, sys, math, fcntl
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
MAX_SVG=2*1024*1024

def digest(data): return hashlib.sha256(data).hexdigest()
def read_json(p): return json.loads(p.read_text())
def safe(root,rel):
    p=root/rel
    if Path(rel).is_absolute() or '..' in Path(rel).parts: raise ValueError('Unsafe path')
    for x in [p,*p.parents]:
        if x==root: break
        if x.is_symlink(): raise ValueError('Symlink not allowed: '+str(x))
    if not p.resolve().is_relative_to(root.resolve()): raise ValueError('Path escapes root')
    return p

def inputs(root):
    m=read_json(safe(root,'diagrams/manifest.json'))
    ids=[f['id'] for f in m['figures']]
    if len(ids)!=len(set(ids)) or any(not re.fullmatch('[a-z0-9-]+',i) for i in ids): raise ValueError('Invalid figure IDs')
    files=['diagrams/manifest.json','diagrams/toolchain.lock.json','scripts/diagrams.py']
    files+=['diagrams/'+x for x in m['inputs']]+['diagrams/'+f['source'] for f in m['figures']]
    hashes={p:digest(safe(root,p).read_bytes()) for p in sorted(set(files))}
    return m,hashes,digest(json.dumps(hashes,sort_keys=True).encode())

def validate_svg(data):
    if not 0<len(data)<=MAX_SVG: raise ValueError('SVG size invalid')
    if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper(): raise ValueError('SVG entities forbidden')
    svg=ET.fromstring(data)
    if svg.tag!='{http://www.w3.org/2000/svg}svg': raise ValueError('Not SVG')
    values=[float(x) for x in svg.attrib.get('viewBox','').split()]
    if len(values)!=4 or not all(math.isfinite(x) for x in values) or not all(0<x<10000 for x in values[2:]): raise ValueError('Invalid viewBox')
    allowed={'svg','g','defs','path','use','rect','circle','ellipse','line','polyline','polygon','clipPath','title','desc'}
    for e in svg.iter():
        if e.tag.split('}')[-1] not in allowed: raise ValueError('Forbidden SVG element: '+e.tag)
        for name,value in e.attrib.items():
            name=name.split('}')[-1].lower()
            if name.startswith('on') or name in ['style','base']: raise ValueError('Forbidden SVG attribute')
            if name=='href' and not re.fullmatch(r'#[\w:.-]+',value): raise ValueError('External SVG reference')
            if 'url(' in value.lower() and not re.fullmatch(r'url\(#[\w:.-]+\)',value): raise ValueError('External SVG URL')
    return values

def normalize_svg(data):
    # dvisvgm may emit glyph definitions in hash-table order. Only reorder
    # independent path definitions, never painted elements or referenced groups.
    validate_svg(data)
    ET.register_namespace('', 'http://www.w3.org/2000/svg')
    ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
    svg=ET.fromstring(data)
    for defs in svg.findall('{http://www.w3.org/2000/svg}defs'):
        ids=[e.get('id') for e in defs]
        if all(e.tag=='{http://www.w3.org/2000/svg}path' for e in defs) and all(ids) and len(set(ids))==len(ids):
            defs[:]=sorted(defs,key=lambda e:e.get('id'))
    return ET.tostring(svg,encoding='utf-8',xml_declaration=True)+b'\n'

def check(root):
    m,hashes,fingerprint=inputs(root)
    generated=read_json(safe(root,'public/img/figures/manifest.json'))
    if generated['inputHash']!=fingerprint: raise ValueError('Generated figures are stale; run npm run diagrams')
    if [f['id'] for f in generated['figures']]!=[f['id'] for f in m['figures']]: raise ValueError('Figure set mismatch')
    for f in generated['figures']:
        data=safe(root/'public',f['url']).read_bytes();validate_svg(data)
        if digest(data)!=f['sha256']: raise ValueError('Generated SVG hash mismatch')
    print(f'diagrams:check OK — {len(m["figures"])} registered SVGs; no TeX executed')
    return generated

def tools():
    candidates=sorted((ROOT/'.tools').glob('mupdf-tools/*/bin/mutool'))
    paths={'lualatex':os.environ.get('DIAGRAM_LUALATEX') or shutil.which('lualatex'),'dvisvgm':os.environ.get('DIAGRAM_DVISVGM') or shutil.which('dvisvgm'),'mutool':os.environ.get('DIAGRAM_MUTOOL') or shutil.which('mutool') or (str(candidates[-1]) if candidates else None)}
    if not all(paths.values()): raise RuntimeError('Missing tool; set DIAGRAM_LUALATEX / DIAGRAM_DVISVGM / DIAGRAM_MUTOOL')
    return {k:Path(v).resolve() for k,v in paths.items()}

def lock_tools():
    t=tools();data={}
    for k,p in t.items():
        args=['-v'] if k=='mutool' else ['--version']
        r=subprocess.run([str(p),*args],capture_output=True,text=True,timeout=10,check=True)
        data[k]={'sha256':digest(p.read_bytes()),'version':(r.stdout+r.stderr).splitlines()[0]}
    (ROOT/'diagrams/toolchain.lock.json').write_text(json.dumps(data,indent=2)+'\n')
    print('Tool identity locked; no absolute paths recorded')

def profile(work,t,extra_exec=()):
    # Default deny: no network, no user files, no writes beyond this job.
    texroot=next((p for p in t['lualatex'].parents if (p/'texmf-dist').is_dir()),None)
    if texroot is None: raise RuntimeError('Unsupported TeX layout; expected a TeX Live tree')
    reads=[str(work),str(texroot),str(t['mutool'].parent.parent),'/System/Library','/usr/lib','/usr/share','/Library/TeX','/dev/null','/dev/urandom','/dev/random','/private/etc/localtime']
    literals=[str(p) for p in t.values()]+['/bin/sh',*extra_exec]
    return '(version 1)\n(deny default)\n(allow sysctl-read)\n(allow process-fork)\n(allow file-read-metadata)\n(allow file-read* (literal "/"))\n'+''.join('(allow file-read* (subpath '+json.dumps(x)+'))\n' for x in reads)+''.join('(allow file-read* process-exec (literal '+json.dumps(x)+'))\n' for x in literals)+'(allow file-write* (subpath '+json.dumps(str(work))+'))\n(allow file-write* (literal "/dev/null"))\n'

def run_sandbox(command,work,t,timeout=20,extra_exec=()):
    if sys.platform!='darwin' or not Path('/usr/bin/sandbox-exec').exists(): raise RuntimeError('No supported sandbox; fail closed. Use documented container port on other systems.')
    policy=work/'sandbox.sb';policy.write_text(profile(work,t,extra_exec))
    env={'PATH':os.pathsep.join([str(t['mutool'].parent),str(t['lualatex'].parent),'/usr/bin','/bin']),'LANG':'C','LC_ALL':'C','TMPDIR':str(work),'TEXMFHOME':str(work),'TEXMFVAR':str(work/'cache'),'TEXMFCACHE':str(work/'cache'),'TEXMFCONFIG':str(work/'cache'),'openin_any':'a','openout_any':'p','SOURCE_DATE_EPOCH':'1700000000','FORCE_SOURCE_DATE':'1','DVISVGM_PDF_PROC':'mutool'}
    def limits():
        resource.setrlimit(resource.RLIMIT_CPU,(15,15));resource.setrlimit(resource.RLIMIT_FSIZE,(8*1024*1024,8*1024*1024));resource.setrlimit(resource.RLIMIT_NOFILE,(64,64));resource.setrlimit(resource.RLIMIT_CORE,(0,0))
    log=work/'process.log'
    with log.open('wb') as output:
        p=subprocess.Popen(['/usr/bin/sandbox-exec','-f',str(policy),*map(str,command)],cwd=work,env=env,stdout=output,stderr=subprocess.STDOUT,start_new_session=True,preexec_fn=limits)
        start=time.monotonic();reason=None
        while p.poll() is None:
            if time.monotonic()-start>timeout: reason='wall timeout'
            if sum(x.stat().st_size for x in work.rglob('*') if x.is_file() and not x.is_symlink())>32*1024*1024: reason='job disk quota'
            # macOS has no reliable RLIMIT_AS. Monitor the entire process group instead.
            ps=subprocess.run(['/bin/ps','-axo','pgid=,rss='],capture_output=True,text=True)
            members=[int(line.split()[1]) for line in ps.stdout.splitlines() if len(line.split())==2 and line.split()[0]==str(p.pid)]
            if sum(members)>512*1024 or len(members)>8: reason='RSS/process quota'
            if reason:
                os.killpg(p.pid,signal.SIGKILL);p.wait();break
            time.sleep(.05)
        # Kill any orphan processes left in this job's group.
        try: os.killpg(p.pid,signal.SIGKILL)
        except ProcessLookupError: pass
    if reason or p.returncode: raise RuntimeError((reason or 'compiler exited '+str(p.returncode))+'\n'+log.read_text(errors='replace')[-3000:])
    return log.read_text(errors='replace')

def generate(root,timeout=20,evidence=None):
    m,hashes,fingerprint=inputs(root);t=tools();lock=read_json(safe(root,'diagrams/toolchain.lock.json'))
    for k,p in t.items():
        if digest(p.read_bytes())!=lock[k]['sha256']: raise RuntimeError('Toolchain changed: '+k+'; review then lock-tools')
    output=safe(root,'public/img/figures');output.mkdir(parents=True,exist_ok=True)
    with safe(root,'diagrams/.generation.lock').open('w') as guard:
        fcntl.flock(guard,fcntl.LOCK_EX|fcntl.LOCK_NB)
        with tempfile.TemporaryDirectory(prefix='diagram-job-') as name:
            work=Path(name).resolve();staged=[]
            for f in m['figures']:
                for x in work.iterdir():
                    if x.is_dir(): shutil.rmtree(x)
                    else: x.unlink()
                for rel in m['inputs']:
                    p=work/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(safe(root/'diagrams',rel).read_bytes())
                (work/'luaotfload.conf').write_text('[db]\nlocation-precedence = texmf\n')
                (work/'figure.tex').write_bytes(safe(root/'diagrams',f['source']).read_bytes())
                log=run_sandbox([t['lualatex'],'--fmt=lualatex','--progname=lualatex','--no-shell-escape','--interaction=nonstopmode','--halt-on-error','--recorder','figure.tex'],work,t,timeout)
                if not re.search(r'Output written on figure.pdf \(1 page[,)]',log): raise ValueError('Expected exactly one PDF page')
                conversion=run_sandbox([t['dvisvgm'],'--pdf','--no-fonts','--optimize=all','--cache=none','--output=figure.svg','figure.pdf'],work,t,timeout)
                if evidence:
                    evidence.mkdir(parents=True,exist_ok=True)
                    (evidence/(f['id']+'.compile.log')).write_text(log)
                    (evidence/(f['id']+'.convert.log')).write_text(conversion)
                    (evidence/(f['id']+'.pdf')).write_bytes((work/'figure.pdf').read_bytes())
                svg=normalize_svg((work/'figure.svg').read_bytes());viewbox=validate_svg(svg);h=digest(svg)
                staged.append(({**f,'url':f'img/figures/{f["id"]}-{h[:16]}.svg','sha256':h,'viewBox':viewbox},svg))
            if inputs(root)[2]!=fingerprint: raise RuntimeError('Inputs changed during generation')
            # Publish only after every figure passed. Old manifest and SVGs survive every failure.
            for entry,data in staged:
                p=safe(root/'public',entry['url'])
                if p.exists() and p.read_bytes()!=data: raise RuntimeError('Hash-path collision')
                if not p.exists(): p.write_bytes(data)
            result={'version':1,'inputHash':fingerprint,'figures':[entry for entry,_ in staged]}
            tmp=safe(root,'public/img/figures/manifest.next.json');tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');os.replace(tmp,output/'manifest.json')
            print('Generated '+', '.join(f['id'] for f,_ in staged))
    return check(root)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['generate','check','lock-tools']);p.add_argument('--evidence',type=Path);args=p.parse_args()
    try:
        if args.action=='check':check(ROOT)
        elif args.action=='lock-tools':lock_tools()
        else:generate(ROOT,evidence=args.evidence)
    except Exception as e:print(str(e),file=sys.stderr);sys.exit(1)
