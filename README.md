# Website

[Web](https://hiroshiprover.github.io)

This repository contains the source code of my personal website, built with [Docusaurus](https://docusaurus.io/) and hosted on GitHub Pages.

## About

This website serves as a collection of my notes on differential geometry, fibre bundles, quantum mechanics, condensed matter physics, and related mathematical topics.

Most articles are written for physics students who wish to understand the underlying geometric and mathematical structures in a more intuitive way.

## Installation

Install dependencies:

```bash
npm install
```

## Local Development

```bash
npm run start
```

This command starts a local development server and opens up a browser window. Most changes will be reflected automatically without restarting the server.

## Build

Generate the static website:

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Math commands

Custom KaTeX macros are defined in `src/config/katex.ts` and shared by Chinese
and English docs, blog posts, and MDX pages. Use them inside `$...$` or multiline
`$$` blocks. KaTeX styles and fonts are bundled locally with the site.

| Command | Meaning |
| --- | --- |
| `\bra{a}`, `\ket{b}` | Bra and ket |
| `\braket{a}{b}` | Inner product ⟨a∣b⟩; two required arguments |
| `\ketbra{a}{b}` | Outer product ∣a⟩⟨b∣; two required arguments |
| `\abs{x}`, `\norm{v}` | Absolute value and norm |
| `\C`, `\F`, `\R`, `\N`, `\Z`, `\Q` | Blackboard bold C, F, R, N, Z, Q |

The delimiters resize to fit their contents. For a projector, write
`\ketbra{\psi}{\psi}`. For an operator matrix element, write
`\bra{\psi} A \ket{\phi}`.

## Deployment

The website is hosted using GitHub Pages. 

Before deployment, always save source changes to the main branch:

```bash
git add .
git commit -m "..."
git push origin main
```

where "..." can be replaced by any text you prefer. Then deploy the website:

```bash
npm run deploy
```

This command automatically:

1. Builds the website.
2. Generates static files in build/.
3. Pushes the generated site to the gh-pages branch.

GitHub Pages serves the website directly from the gh-pages branch.

## Project structure

```plain text
.
├── blog/          # Chinese blog posts (default locale)
├── docs/          # Chinese documentation pages (default locale)
├── i18n/en/       # English translations
├── src/           # React components and pages
├── static/        # Static assets
└── docusaurus.config.ts
```

## Note

If Docusaurus shows stale content, clear the cache:

```bash
npm run clear
```

Then rebuild or redeploy:

```bash
npm run build
```
or:
```bash
npm run deploy
```
