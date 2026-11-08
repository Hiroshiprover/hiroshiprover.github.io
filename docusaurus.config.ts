import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMathExtended from 'remark-math-extended';
import rehypeKatex from 'rehype-katex';
import {katexOptions} from './src/config/katex';

// The editor owns authoring state outside the published site. Both site modes
// render the same committed content without the old preview/staging plugin.
const previewKatex = () => (tree: any, file: any) => rehypeKatex(katexOptions)(tree, file);

const projSidebarItemsGenerator = async ({ defaultSidebarItemsGenerator, ...args }) => {
  const items = await defaultSidebarItemsGenerator(args);
  const titles = new Map(args.docs.map((doc) => [doc.id, doc.title]));
  const translateLabels = (entries) => entries.map((item) => {
    if (item.type === 'category') return {...item, items: translateLabels(item.items)};
    if (item.type === 'doc' || item.type === 'ref') {
      const label = item.label ?? titles.get(item.id);
      return label === undefined ? item : {...item, label, translatable: true};
    }
    return item;
  });
  return translateLabels(items);
};
const projDocsOptions = {
  id: 'proj',
  path: './proj',
  routeBasePath: '/proj',
  sidebarPath: './sidebars.proj.ts',
  sidebarItemsGenerator: projSidebarItemsGenerator,
  includeCurrentVersion: true,
  remarkPlugins: [remarkMathExtended],
  rehypePlugins: [previewKatex],
};

const blogOptions = {
  blogTitle: '博客',
  blogDescription: '博客',
  showReadingTime: true,
  blogSidebarCount: 0,
  remarkPlugins: [remarkMathExtended],
  rehypePlugins: [previewKatex],
  feedOptions: {
    type: ['rss', 'atom'],
    xslt: true,
  },
  onInlineTags: 'warn',
  onInlineAuthors: 'warn',
  onUntruncatedBlogPosts: 'warn',
};
const pagesOptions = {
  remarkPlugins: [remarkMathExtended],
  rehypePlugins: [previewKatex],
};
const config: Config = {
  title: 'Hiroshiprover',
  tagline: '"Physics is dirty Math."',
  favicon: 'img/favicon.ico',

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'apple-touch-icon',
        sizes: '512x512',
        href: '/apple-touch-icon.png',
      },
    },
  ],

  future: {
    v4: true,
    // C1 runs the real site's dev server; keep Rspack's persistent cache off
    // so no build cache becomes a source of drift. The agent also starts with
    // DOCUSAURUS_NO_PERSISTENT_CACHE=1. No build is run in the real site.
    faster: {
      rspackPersistentCache: false,
    },
  },

  url: 'https://hiroshiprover.github.io',
  baseUrl: '/',

  trailingSlash: true,
  deploymentBranch: 'gh-pages',

  organizationName: 'Hiroshiprover', 
  projectName: 'Hiroshiprover.github.io', 

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    localeConfigs: {
      zh: {label: '中文', htmlLang: 'zh-CN'},
      en: {label: 'English', htmlLang: 'en'},
    },
  },

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  plugins: [
    ['@docusaurus/plugin-content-docs', projDocsOptions],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: undefined,
          remarkPlugins: [remarkMathExtended],
          rehypePlugins: [previewKatex],
          routeBasePath: '/docs',
          includeCurrentVersion: true,
        },
        blog: blogOptions,
        pages: pagesOptions,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  stylesheets: [
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
        {to: '/docs/intro', label: '笔记', position: 'left'},
        {to: '/blog', label: '随笔', position: 'left'},
        {type: 'docSidebar', sidebarId: 'projSidebar', docsPluginId: 'proj', label: '项目', position: 'left'},
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
          title: '链接',
          items: [
            {
              label: '源代码',
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
