module.exports = {
  locales: {
    '/': {
      lang: 'English',
      title: 'SubQuery Guide',
      description: 'SubQuery is a open-source tool to provide a complete process and query data solution to every substrate project and will become core infrastructure for the Polkadot ecosystem.'
    },
  },
  themeConfig: {
    logo: '/assets/img/logo.png',
    logoLink: 'https://subquery.network',
    lastUpdated: true,
    navbar: [
      { text: 'Explorer', link: 'https://explorer.subquery.network/', target: '_blank', rel: '' },
      { text: 'Projects', link: 'https://project.subquery.network/', target: '_blank', rel: '' },
      { text: 'Documentation', link: '/' },
      { text: 'GitHub', link: 'https://github.com/subquery/subql', target: '_blank', rel: '' },
    ],
    sidebarDepth: 2,
    sidebar: [
      {
        text: 'Welcome to SubQuery',
        link: '/README.md',
        isGroup: true,
        children: [
          '/README.md',
        ]
      },
      {
        text: 'Quick Start Guide',
        link: '/quickstart.md',
        isGroup: true,
        children: [
          '/quickstart.md',
        ]
      },
      {
        text: 'Create a Project',
        link: '/create/introduction.md',
        isGroup: true,
        children: [
          '/create/introduction.md',
          '/create/manifest.md',
          '/create/graphql.md',
          '/create/mapping.md',
        ]
      },
      {
        text: 'Run a Project',
        link: '/run/run.md',
        isGroup: true,
        children: [
          '/run/run.md',
          '/run/sandbox.md',
        ]
      },
      {
        text: 'Publish a Project',
        link: '/publish/publish.md',
        isGroup: true,
        children: [
          '/publish/publish.md',
          '/publish/upgrade.md',
          '/publish/connect.md',
        ]
      },
      {
        text: 'Query your Data',
        link: '/query/query.md',
        isGroup: true,
        children: [
          '/query/query.md',
          '/query/graphql.md'
        ]
      }
    ],
  },
  plugins: [
    ['@vuepress/search', {
      searchMaxSuggestions: 10
    }],
    [
      '@vuepress/plugin-google-analytics',
      {
        id: 'G-MY90N76MNK',
      },
    ],
  ],
  markdown: {
    extractHeaders: {
      level: [2,3,4]
    }
  }
}


