import { defineConfig } from 'vitepress'

const base = process.env.DOCS_BASE || '/cad-viewer/docs/'

function guideSidebar(labels: Record<string, string>) {
  return [
    {
      text: labels.ui,
      collapsed: false,
      items: [
        { text: labels.uiWrite, link: '/guide/ui/write' },
      ],
    },
    {
      text: labels.gesturesGroup,
      collapsed: false,
      items: [
        { text: labels.gestures, link: '/guide/operations' },
        { text: labels.simmouse, link: '/guide/simulated-mouse' },
        { text: labels.magnifier, link: '/guide/magnifier' },
        { text: labels.sessionPanel, link: '/guide/session-panel' },
        { text: labels.sessionAccessory, link: '/guide/session-accessory' },
        { text: labels.aids, link: '/guide/aids' },
      ],
    },
    {
      text: labels.measureGroup,
      collapsed: false,
      items: [
        { text: labels.msOverview, link: '/guide/measure/overview' },
        { text: labels.msDistance, link: '/guide/measure/distance' },
        { text: labels.msContinuous, link: '/guide/measure/distance-continuous' },
        { text: labels.msArea, link: '/guide/measure/area' },
        { text: labels.msCoords, link: '/guide/measure/coordinates' },
        { text: labels.msArc, link: '/guide/measure/arc-length' },
        { text: labels.msAngle, link: '/guide/measure/angle' },
        { text: labels.msResults, link: '/guide/measure/results' },
      ],
    },
  ]
}

export default defineConfig({
  title: 'MLightCAD Viewer',
  description: 'Web-based CAD Viewer',
  base,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }]],
  ignoreDeadLinks: true,
  markdown: {
    theme: 'github-dark',
  },
  lang: 'en-US',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/ui/write' },
      { text: 'API', link: 'https://cad-viewer.readthedocs.io/en/latest/' },
      { text: 'GitHub', link: 'https://github.com/mlightcad/cad-viewer' },
    ],
    sidebar: guideSidebar({
      ui: 'User Interface',
      uiWrite: 'Write Mode',
      gesturesGroup: 'Operations and Aids',
      gestures: 'Operations',
      simmouse: 'Simulated Mouse (Mobile)',
      magnifier: 'Magnifier (Mobile)',
      aids: 'Drawing Aids',
      sessionAccessory: 'Session Accessory',
      sessionPanel: 'Session Panel (Mobile)',
      measureGroup: 'Measurement',
      msOverview: 'Measurement Overview',
      msDistance: 'Distance',
      msContinuous: 'Continuous Distance',
      msArea: 'Area',
      msCoords: 'Coordinates',
      msArc: 'Arc Length',
      msAngle: 'Angle',
      msResults: 'View Results',
    }),
  },
})
