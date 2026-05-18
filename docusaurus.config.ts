import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const config: Config = {
  title: 'Hiroshiprover',
  tagline: '"Physics is dirty Math."',
  favicon: 'img/favicon.ico',

  future: {
    v4: true, 
  },

  url: 'https://hiroshiprover.github.io',
  baseUrl: '/',

  trailingSlash: true,
  deploymentBranch: 'gh-pages',

  organizationName: 'Hiroshiprover', 
  projectName: 'Hiroshiprover.github.io', 

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    localeConfigs: {zh: {label: '中文',},},
  },

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
          routeBasePath: '/docs',
          includeCurrentVersion: true,
        },
        blog: {
          showReadingTime: true,
          blogSidebarCount: 0,
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        pages: {
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css',
      type: 'text/css',
      crossorigin: 'anonymous',
    },
    'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600&family=Schibsted+Grotesk:wght@500;700&family=IBM+Plex+Mono&display=swap',
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Hiroshiprover',
      logo: {
        alt: 'My Site Logo',
        src: 'img/image.png',
      },
      items: [
        {to: '/docs/intro', label: 'Contents', position: 'left'},
        {to: '/blog', label: 'Blog', position: 'left'},
        {type: 'localeDropdown', position: 'right', dropdownItemsAfter: [], dropdownItemsBefore: []},
        {
          href: 'https://github.com/Hiroshiprover',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Access',
          items: [
            {
              label: 'Source',
              href: 'https://github.com/Hiroshiprover/Hiroshiprover.github.io',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Hiroshiprover. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
