const { config } = require("vuepress-theme-hope");

module.exports = config({
  locales: {
    "/": {
      lang: "en-UK",
      title: "SubQuery Blog Posts",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
    },
    "/de/": {
      lang: "de",
      title: "SubQuery Blog Posts",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!.",
    },
    // "/id/": {
    //   lang: "id",
    //   title: "SubQuery Blog Posts",
    //   description:
    //     "Explore and transform your chain data to build intuitive dApps faster!.",
    // },
    // "/ru/": {
    //   lang: "ru",
    //   title: "SubQuery Blog Posts",
    //   description:
    //     "Explore and transform your chain data to build intuitive dApps faster!.",
    // },
    // "/th/": {
    //   lang: "th",
    //   title: "SubQuery Blog Posts",
    //   description:
    //     "Explore and transform your chain data to build intuitive dApps faster!.",
    // },
    // "/tr/": {
    //   lang: "tr",
    //   title: "SubQuery Blog Posts",
    //   description:
    //     "Explore and transform your chain data to build intuitive dApps faster!.",
    // },
    // "/uk/": {
    //   lang: "uk",
    //   title: "SubQuery Blog Posts",
    //   description:
    //     "Explore and transform your chain data to build intuitive dApps faster!.",
    // },
    "/vi/": {
      lang: "vi",
      title: "SubQuery Blog Posts",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!.",
    },
    "/zh/": {
      lang: "zh-CN",
      title: "SubQuery Blog Posts",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!.",
    },
    /*
    "/es/": {
      lang: "es",
      title: "SubQuery Blog Posts",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!.",
    },
    */
    /*
    "/it/": {
      lang: "it",
      title: "SubQuery Blog Posts",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!.",
    },
    "/ja/": {
      lang: "ja",
      title: "SubQuery Blog Posts",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!.",
    },
    "/ko/": {
      lang: "ko",
      title: "SubQuery Blog Posts",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!.",
    },
    */
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
    themeColor: false,
    sidebar: [
      {
        title: 'Welcome to SubQuery',
        path: '/',
        collapsable: true,
      },
      {
        title: 'Quick Start Guide',
        path: '/quickstart/quickstart',
        collapsable: true,
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
        collapsable: true,
        children: [
          '/install/install.md'
        ]
      },
      {
        title: 'Create a Project',
        path: '/create/introduction',
        collapsable: true,
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
        collapsable: true,
        children: [
          '/run/run.md',
          '/run/sandbox.md',
        ]
      },
      {
        title: 'Publish a Project',
        path: '/publish/publish',
        collapsable: true,
        children: [
          '/publish/publish.md',
          '/publish/upgrade.md',
          '/publish/connect.md',
        ]
      },
      {
        title: 'Query your Data',
        path: '/query/query',
        collapsable: true,
        children: [
          '/query/query.md',
          '/query/graphql.md'
        ]
      },
      {
        title: 'Tutorials & Examples',
        path: '/tutorials_examples/introduction',
        collapsable: true,
        children: [
          '/tutorials_examples/introduction',
          '/tutorials_examples/block-height.md',
          '/tutorials_examples/batch-size.md',
          '/tutorials_examples/run-indexer.md',
          '/tutorials_examples/dictionary.md',
          '/tutorials_examples/debug-projects.md',
          '/tutorials_examples/terminology.md',
        ]
      },
      {
        title: 'FAQs',
        path: '/faqs/faqs.md',
        collapsable: true,
        children: []
      },
      {
        title: 'Miscellaneous',
        path: '/miscellaneous/contributing',
        collapsable: true,
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
        collapsable: true,
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
    extractHeaders: ['h2', 'h3'],
  }
})
