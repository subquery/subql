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
    locales: {
      '/': getSidebar('', 'English'),
      '/zh/': getSidebar('/zh', 'Chinese'),
      '/de/': getSidebar('/de', 'German'),
      '/vi/': getSidebar('/vi', 'Vietnamese')
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
  }
})

chainWebpack: config => {
  /** Webpack rule to handle some non-image assets that we'll use */
  config.module
    .rule('files')
    .test(/\.(pdf|zip|ait|log|txt)$/)
    .use('file-loader')
    .loader('file-loader')
    .options({
      name: `[path][name].[ext]`,
      limit: 10000,
      esModule: false,
    });
  /** Explicitly setting esModule:false
   * to avoid this issue https://github.com/vuejs/vue-loader/issues/1612
   */
  config.module
    .rule('images')
    .use('url-loader')
    .options({
      limit: 10000,
      esModule: false,
    });
}

function getSidebar(locale, language){ 
  return {
    selectLanguageName: language,
    sidebar: [
    {
      title: 'Welcome to SubQuery',
      path: `${locale === '' ? '/' : locale}`,
      collapsable: true,
    },
    {
      title: 'Quick Start Guide',
      path: `${locale}/quickstart/quickstart`,
      collapsable: true,
      children: [
        `${locale}/quickstart/quickstart.md`,
        `${locale}/quickstart/helloworld-localhost.md`,
        `${locale}/quickstart/understanding-helloworld.md`,
        `${locale}/quickstart/helloworld-hosted.md`,
      ]
    },
    {
      title: 'Installation',
      path: `${locale}/install/install`,
      collapsable: true,
      children: [
        `${locale}/install/install.md`
      ]
    },
    {
      title: 'Create a Project',
      path: `${locale}/create/introduction`,
      collapsable: true,
      children: [
        `${locale}/create/introduction.md`,
        `${locale}/create/manifest.md`,
        `${locale}/create/graphql.md`,
        `${locale}/create/mapping.md`,
        `${locale}/create/moonbeam.md`
      ]
    },
    {
      title: 'Run a Project',
      path: `${locale}/run/run`,
      collapsable: true,
      children: [
        `${locale}/run/run.md`,
        `${locale}/run/sandbox.md`,
      ]
    },
    {
      title: 'Publish a Project',
      path: `${locale}/publish/publish`,
      collapsable: true,
      children: [
        `${locale}/publish/publish.md`,
        `${locale}/publish/upgrade.md`,
        `${locale}/publish/connect.md`,
      ]
    },
    {
      title: 'Query your Data',
      path: `${locale}/query/query`,
      collapsable: true,
      children: [
        `${locale}/query/query.md`,
        `${locale}/query/graphql.md`
      ]
    },
    {
      title: 'Tutorials & Examples',
      path: `${locale}/tutorials_examples/introduction`,
      collapsable: true,
      children: [
        `${locale}/tutorials_examples/introduction`,
        `${locale}/tutorials_examples/block-height.md`,
        `${locale}/tutorials_examples/batch-size.md`,
        `${locale}/tutorials_examples/run-indexer.md`,
        `${locale}/tutorials_examples/dictionary.md`,
        `${locale}/tutorials_examples/debug-projects.md`,
        `${locale}/tutorials_examples/terminology.md`,
      ]
    },
    {
      title: 'The Hero Course',
      path: `${locale}/academy/herocourse`,
      collapsable: true,
      children: [
        `${locale}/academy/herocourse/`,
        `${locale}/academy/herocourse/module1.md`,
        `${locale}/academy/herocourse/module2.md`,
        `${locale}/academy/herocourse/module3.md`,
        `${locale}/academy/herocourse/module4.md`,
        `${locale}/academy/herocourse/module5.md`,
        `${locale}/academy/herocourse/module6.md`,
      ]
    },
    {
      title: 'FAQs',
      path: `${locale}/faqs/faqs.md`,
      collapsable: true,
      children: []
    },
    {
      title: 'Miscellaneous',
      path: `${locale}/miscellaneous/contributing`,
      collapsable: true,
      children: [
        `${locale}/miscellaneous/contributing.md`,
        `${locale}/miscellaneous/social_media.md`,
        `${locale}/miscellaneous/branding.md`,
        `${locale}/miscellaneous/ambassadors.md`,
      ]
    },
    {
      title: 'References',
      path: `${locale}/references/references`,
      collapsable: true,
      children: [
        `${locale}/references/references.md`,
      ]
    }
  ]}
}
