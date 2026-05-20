import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Differential Geometry and Fibre Bundle for Babies',
      items: [
        'Differential Geometry and Fibre Bundle/topology',
        'Differential Geometry and Fibre Bundle/linear-algebra',
        'Differential Geometry and Fibre Bundle/tensors',
        'Differential Geometry and Fibre Bundle/change-of-basis',
        'Differential Geometry and Fibre Bundle/manifold',
        'Differential Geometry and Fibre Bundle/tangent-space',
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
        'Differential Geometry and Fibre Bundle/topology',
        'Differential Geometry and Fibre Bundle/linear-algebra',
        'Differential Geometry and Fibre Bundle/tensors',
        'Differential Geometry and Fibre Bundle/change-of-basis',
        'Differential Geometry and Fibre Bundle/manifold',
        'Differential Geometry and Fibre Bundle/tangent-space',
      ],
    },

    {
      type: 'doc',
      id: 'intro',
    },
  ],
};

export default sidebars;