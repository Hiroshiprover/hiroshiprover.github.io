# TikZ figures in my-site

This directory is the site's current TikZ source, not a standalone Vite prototype. For setup, exact commands, generator prerequisites and workspace cleanup boundaries, see [the science workflow](../../README.md).

From the site root:

```sh
npm run science:tex:setup  # Fresh macOS Apple Silicon checkout only
npm run science:tex       # Explicit generation with the pinned local tools
npm run science:sync      # Copy results to the website
npm run science:check     # Validate source fingerprints and published copies
```

`manifest.json` lists figure IDs, TeX source paths, titles and captions. `style.tex` is shared by all three samples. `toolchain.lock.json` pins the tool binaries; `mutool-download.json` records the optional local runtime download. `../scripts/diagrams.py` generates content-addressed SVGs and `../scripts/setup-mutool.py` prepares mutool under `../.tools/`.

- `samples/residue-contour.tex`: residue-theorem contour and poles.
- `samples/feynman-exchange.tex`: single-photon exchange diagram.
- `samples/geometry-cube.tex`: cube projection and volume/surface formulas.

Saved SVGs and their manifest live in `../public/img/figures/`; published copies are under the site's `static/img/figures/`. Build validation requires both matching copies. Figure captions/alt text are rendered by the site's React component, and asset URLs use Docusaurus baseUrl.

Generation retains the existing macOS sandbox, disabled shell escape, tool identity checks, SVG checks and resource limits. None of these tools runs during a website build. Figure text is outlined in the SVG; current samples do not exercise Chinese labels inside TeX. Dark mode keeps the white figure background.
