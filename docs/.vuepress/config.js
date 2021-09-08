const { config } = require("vuepress-theme-hope");

module.exports = config({
  locales: {
    '/': {
      lang: 'English',
      title: 'SubQuery Docs',
      description: 'Explore and transform your chain data to build intuitive dApps faster!.',
    }
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
        collapsable: false,
      },
      {
        title: 'Quick Start Guide',
        path: '/quickstart/quickstart',
        collapsable: false,
        children: [
          '/quickstart/quickstart.md',
          '/quickstart/helloworld-localhost.md',
          '/quickstart/understanding-helloworld.md',
          '/quickstart/helloworld-hosted.md',
        ]
      },
      {
        title: 'Installation',
        path: '/install/install',
        collapsable: false,
        children: [
          '/install/install.md'
        ]
      },
      {
        title: 'Create a Project',
        path: '/create/introduction',
        collapsable: false,
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
        collapsable: false,
        children: [
          '/run/run.md',
          '/run/sandbox.md',
        ]
      },
      {
        title: 'Publish a Project',
        path: '/publish/publish',
        collapsable: false,
        children: [
          '/publish/publish.md',
          '/publish/upgrade.md',
          '/publish/connect.md',
        ]
      },
      {
        title: 'Query your Data',
        path: '/query/query',
        collapsable: false,
        children: [
          '/query/query.md',
          '/query/graphql.md'
        ]
      },
      {
        title: 'Tutorials & Examples',
        path: '/tutorials_examples/introduction',
        collapsable: false,
        children: [
          '/tutorials_examples/block-height.md',
          '/tutorials_examples/batch-size.md',
          '/tutorials_examples/run-indexer.md',
          '/tutorials_examples/dictionary.md',
          '/tutorials_examples/terminology.md',
        ]
      },
      {
        title: 'FAQs',
        path: '/faqs/faqs.md',
        collapsable: false,
        children: []
      },
      {
        title: 'Miscellaneous',
        path: '/miscellaneous/contributing',
        collapsable: false,
        children: [
          '/miscellaneous/contributing.md',
          '/miscellaneous/social_media.md',
          '/miscellaneous/branding.md',
          '/miscellaneous/ambassadors.md',
        ]
      },
      {
        title: 'References',
        path: '/references/references',
        collapsable: false,
        children: [
          '/references/references.md',
        ]
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
    extractHeaders: ['h2','h3','h4'],
  }
})


