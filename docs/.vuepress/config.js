const { config } = require("vuepress-theme-hope");

const enSideBarConfig = require("../sidebar_locales/en")
const deSideBarConfig = require("../sidebar_locales/de")
const zhSideBarConfig = require("../sidebar_locales/zh")
const viSideBarConfig = require("../sidebar_locales/vi")

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
      '/': enSideBarConfig,
      '/zh/': zhSideBarConfig,
      '/de/': deSideBarConfig,
      '/vi/': viSideBarConfig
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