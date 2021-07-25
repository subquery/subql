module.exports = {
  locales: {
    '/': {
      lang: 'English',
      title: 'SubQuery Docs',
      description: 'SubQuery is a open-source tool to provide a complete process and query data solution to every substrate project and will become core infrastructure for the Polkadot ecosystem.'
    },
  },
  themeConfig: {
    logo: '/assets/img/logo.png',
    logoLink: 'https://subquery.network',
    lastUpdated: true,
    nav: [
      { text: 'Explorer', link: 'https://explorer.subquery.network/', target: '_blank', rel: '' },
      { text: 'Projects', link: 'https://project.subquery.network/', target: '_blank', rel: '' },
      { text: 'Documentation', link: '/' },
      { text: 'GitHub', link: 'https://github.com/subquery/subql', target: '_blank', rel: '' },
    ],
    sidebarDepth: 2,
    sidebar: [
      {
        title: 'Welcome to SubQuery',
        path: '/',
      },
      {
        title: 'Quick Start Guide',
        path: '/quickstart/quickstart',
        children: [
          '/quickstart/quickstart.md',
          '/quickstart/helloworld-localhost.md',
          '/quickstart/understanding-helloworld.md',
          '/quickstart/helloworld-hosted.md',
        ]
      },
      {
        title: 'Create a Project',
        path: '/create/introduction',
        children: [
          '/create/introduction.md',
          '/create/manifest.md',
          '/create/graphql.md',
          '/create/mapping.md',
        ]
      },
      {
        title: 'Run a Project',
        path: '/run/run',
        children: [
          '/run/run.md',
          '/run/sandbox.md',
        ]
      },
      {
        title: 'Publish a Project',
        path: '/publish/publish',
        children: [
          '/publish/publish.md',
          '/publish/upgrade.md',
          '/publish/connect.md',
        ]
      },
      {
        title: 'Query your Data',
        path: '/query/query',
        children: [
          '/query/query.md',
          '/query/graphql.md'
        ]
      },
      {
        title: 'Tutorials & Examples',
        path: '/tutorials_examples/introduction',
        children: [
          '/tutorials_examples/howto.md',
        ]
      },
      {
        title: 'Technical References',
        path: '/',
        children: []
      },
      {
        title: 'FAQs',
        path: '/faqs/faqs.md',
        children: []
      }
    ],
  },
  plugins: [
    ['fulltext-search'],
    [
      '@vuepress/plugin-google-analytics',
      {
        id: 'G-MY90N76MNK',
      },
    ],
  ],
  markdown: {
    extractHeaders: ['h2','h3','h4']
  }
}


