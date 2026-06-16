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
├── blog/          # English blog posts
├── docs/          # English documentation pages
├── i18n/zh/       # Chinese translations
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