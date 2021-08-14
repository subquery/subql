module.exports = {
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
        title: 'Installation',
        path: '/install/install',
        children: [
          '/install/install.md'
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
          '/tutorials_examples/terminology.md',
        ]
      },
      {
        title: 'FAQs',
        path: '/faqs/faqs.md',
        children: []
      },
      {
        title: 'Miscellaneous',
        path: '/miscellaneous/contributing',
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
}


