import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Differential Geometry and Fibre Bundle for Babies',
      items: [
        'Differential Geometry and Fibre Bundle/01-topology',
        'Differential Geometry and Fibre Bundle/02-linear-algebra',
        'Differential Geometry and Fibre Bundle/03-tensors',
        'Differential Geometry and Fibre Bundle/04-change-of-basis',
        'Differential Geometry and Fibre Bundle/05-manifold',
        'Differential Geometry and Fibre Bundle/06-tangent-space',
      ],
    },

    {
      type: 'doc',
      id: 'intro',
    },
  ],

  tutorialSidebarZh: [
    {
      type: 'category',
      label: '宝宝用微分几何与纤维丛',
      items: [
        'Differential Geometry and Fibre Bundle/01-topology',
        'Differential Geometry and Fibre Bundle/02-linear-algebra',
        'Differential Geometry and Fibre Bundle/03-tensors',
        'Differential Geometry and Fibre Bundle/04-change-of-basis',
        'Differential Geometry and Fibre Bundle/05-manifold',
        'Differential Geometry and Fibre Bundle/06-tangent-space',
      ],
    },

    {
      type: 'doc',
      id: 'intro',
    },
  ],
};

export default sidebars;