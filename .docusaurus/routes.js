import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/zh/blog/',
    component: ComponentCreator('/zh/blog/', 'df3'),
    exact: true
  },
  {
    path: '/zh/blog/archive/',
    component: ComponentCreator('/zh/blog/archive/', 'd8a'),
    exact: true
  },
  {
    path: '/zh/blog/Differential Geometry and Fibre Bundle/1_1/',
    component: ComponentCreator('/zh/blog/Differential Geometry and Fibre Bundle/1_1/', 'e20'),
    exact: true
  },
  {
    path: '/zh/blog/tags/',
    component: ComponentCreator('/zh/blog/tags/', '399'),
    exact: true
  },
  {
    path: '/zh/blog/tags/中文/',
    component: ComponentCreator('/zh/blog/tags/中文/', '72a'),
    exact: true
  },
  {
    path: '/zh/docs/',
    component: ComponentCreator('/zh/docs/', 'd04'),
    routes: [
      {
        path: '/zh/docs/',
        component: ComponentCreator('/zh/docs/', '727'),
        routes: [
          {
            path: '/zh/docs/',
            component: ComponentCreator('/zh/docs/', '4e7'),
            routes: [
              {
                path: '/zh/docs/intro/',
                component: ComponentCreator('/zh/docs/intro/', '068'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/zh/docs/todos/',
                component: ComponentCreator('/zh/docs/todos/', '84a'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/zh/',
    component: ComponentCreator('/zh/', 'a79'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
