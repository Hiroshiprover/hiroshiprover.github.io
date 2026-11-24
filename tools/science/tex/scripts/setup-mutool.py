"""Optional, explicit local setup: no global package manager or shell pipe."""
from pathlib import Path
import hashlib,json,platform,subprocess,tarfile,tempfile,shutil
root=Path(__file__).resolve().parents[1]
if platform.system()!='Darwin' or platform.machine()!='arm64':
    raise SystemExit('This verified bottle is macOS Apple Silicon only. Supply DIAGRAM_MUTOOL for another platform.')
meta=json.loads((root/'diagrams/mutool-download.json').read_text())
target=root/'.tools/mupdf-tools/1.28.6'
if target.exists():
    print('Local tool already exists; leaving it unchanged. Use DIAGRAM_MUTOOL to select another tool.')
    raise SystemExit(0)
(root/'.tools').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(dir=root/'.tools',prefix='download-') as temp:
    temp=Path(temp);archive=temp/'mupdf.tar.gz'
    subprocess.run(['curl','--fail','--location','--proto','=https','--tlsv1.2','--output',str(archive),meta['url']],check=True)
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=meta['sha256']:raise SystemExit('Archive checksum mismatch')
    with tarfile.open(archive) as tar:tar.extractall(temp/'extracted',filter='data')
    extracted=temp/'extracted/mupdf-tools/1.28.6'
    if not (extracted/'bin/mutool').is_file():raise SystemExit('Unexpected archive layout')
    (target/'bin').mkdir(parents=True,exist_ok=True)
    shutil.copy2(extracted/'bin/mutool',target/'bin/mutool')
    for name in ['COPYING','README','CHANGES','sbom.spdx.json']:
        shutil.copy2(extracted/name,target/name)
print('Installed project-local mutool. From the site root, run npm run science:tex to generate figures.')
