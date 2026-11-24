# Search and scientific artifacts

The integrated site uses `/search/`, `/science/`, `/science/interactive/`, `/science/notebook/` and `/science/figures/`. Each also has an `/en/` route; science examples and untranslated project notes currently retain Chinese content there.

All project sources, saved artifacts, manifests and installation instructions now live in this repository. Old Codex prototype workspaces are not required. Node dependencies, a local Python environment and TeX tools are separate from the published website.

## Website and search

Use Node >=20.18.1 and `npm ci` with the repository's `package-lock.json`. This installs pinned Pagefind/Cheerio dependencies and applies the version-locked Docusaurus lifecycle patch. Keep `patches/` and `scripts/patch-docusaurus.cjs` with the dependency files.

Search indexes the rendered published docs, blog, projects and Markdown pages separately for each language during `npm run build`. It excludes draft, unlisted, staging/editor and noindex records. `npm start` does not create or refresh search indexes. Review search using an isolated production build and `npm run serve -- --host 127.0.0.1 --port 4178 --no-open`; choose another unused port when necessary. Do not build or clear caches in the working directory of a running site service.

The science pages render saved Python/Notebook data and TikZ SVGs. Site builds check their source fingerprints and published copies using `plugins/science-artifacts/index.cjs`; they do not run Python, Jupyter or TeX. A direct integrity check without a build is:

```sh
npm run science:check
```

## Regenerate Python and Notebook outputs

The saved environment uses Python 3.13.2 on macOS and the exact versions in `python/requirements.lock`. Install a matching Python 3.13 interpreter, then run from the site root:

```sh
python3 -m venv tools/science/python/.venv
tools/science/python/.venv/bin/python -m pip install -r tools/science/python/requirements.lock
npm run science:python
npm run science:sync
npm run science:check
```

The generator checks installed package versions, computes the two-band model, executes the local Notebook, and saves content-addressed results. `science:sync` updates the site's published copies, generated Notebook page and Python source display. `.venv` and generation caches are ignored by Git. A different Python/platform or dependency set may produce different output bytes and needs an explicit regeneration; do not change the saved manifest to bypass it.

## Regenerate TikZ figures

Sources are under `tex/diagrams/`; the generator is `tex/scripts/diagrams.py`. The existing macOS Apple Silicon toolchain uses TeX Live 2025 (LuaHBTeX 1.21.0, dvisvgm 3.4.3) and mutool 1.28.6, pinned by binary hashes in `tex/diagrams/toolchain.lock.json`. TeX Live remains a system installation, outside Codex workspaces. Its `lualatex` and `dvisvgm` commands must be on PATH, or selected with `DIAGRAM_LUALATEX` and `DIAGRAM_DVISVGM`.

The working Mac has a project-local mutool runtime in `tex/.tools/mupdf-tools/1.28.6/`, including its license and source metadata. It is ignored by Git. On a fresh macOS Apple Silicon checkout, prepare it explicitly (Python >=3.12):

```sh
npm run science:tex:setup
```

This downloads the archive named in `tex/diagrams/mutool-download.json`, checks its SHA-256 and keeps the standalone executable plus license/metadata inside the project. Existing local tools are left in place. The generator discovers this directory automatically; `DIAGRAM_MUTOOL` can select another executable. No global install or old workspace path is needed.

Then regenerate and synchronize:

```sh
npm run science:tex
npm run science:sync
npm run science:check
```

Generation requires the existing macOS `sandbox-exec` backend. Saved SVG validation and website builds do not require TeX, mutool or that backend. When intentionally upgrading the toolchain, run `python3 tools/science/tex/scripts/diagrams.py lock-tools`, then regenerate and sync before building; changing the lock alone leaves stale artifacts. The lock pins binaries, not every TeX package or system library, so cross-machine byte identity is not guaranteed.

## Files needed after workspace cleanup

Keep `tools/science/` (source, parameters, Notebook, dependency/tool locks, manifests, saved outputs and setup helper), `static/generated/`, `static/img/figures/`, `src/components/Science/`, `src/pages/science/`, and the science plugin/sync/check scripts. The source-side outputs and published copies are both checked at build time. Local `.venv`, `.cache` and `.tools` are disposable only when you are willing to recreate the corresponding generator environment; they are not required to serve saved results.

Keep the search plugin, search components/page, dependency lock and lifecycle patch with the ordinary site source. Prototype delivery packages, historical builds and old QA worktrees are not runtime dependencies. No automatic watcher, Live Editor bridge or online Python backend is part of this integration.
