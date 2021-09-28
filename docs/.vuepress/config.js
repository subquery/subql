const { config } = require("vuepress-theme-hope");

module.exports = config({
  locales: {
    "/": {
      lang: "en-UK",
      title: "SubQuery Documentation",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
    },
    "/de/": {
      lang: "de",
      title: "SubQuery Documentation",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
    },
    /*
    "/es/": {
      lang: "es",
      title: "SubQuery Documentation",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
    },
    "/id/": {
      lang: "id",
      title: "SubQuery Documentation",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
    },
    "/it/": {
      lang: "it",
      title: "SubQuery Documentation",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
    },
    "/ja/": {
      lang: "ja",
      title: "SubQuery Documentation",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
    },
    "/ko/": {
      lang: "ko",
      title: "SubQuery Documentation",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
    },
    "/ru/": {
      lang: "ru",
      title: "SubQuery Documentation",
      description:
        "Исследуйте и преобразуйте ваши блокчейн данные, чтобы быстрее создавать интуитивно понятные приложения!",
    },
    "/th/": {
      lang: "th",
      title: "SubQuery Documentation",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
    },
    "/tr/": {
      lang: "tr",
      title: "SubQuery Documentation",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
    },
    "/uk/": {
      lang: "uk",
      title: "SubQuery Documentation",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
    },
    */
    "/vi/": {
      lang: "vi",
      title: "SubQuery Documentation",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
    },
    "/zh/": {
      lang: "zh-CN",
      title: "SubQuery Documentation",
      description:
        "Explore and transform your chain data to build intuitive dApps faster!",
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
    themeColor: false,
    locales: {
      "/": {
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
              '/tutorials_examples/introduction.md',
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
            path: '/faqs/faqs',
            collapsable: true,
            children: [
              '/faqs/faqs.md',
            ]
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
            title: 'Reference Docs',
            path: '/references/references',
            collapsable: true,
            children: [
              '/references/references.md',
            ]
          }
        ],
      },
      "/de/": {
        sidebar: [
          {
            title: 'Welcome to SubQuery',
            path: '/de/',
            collapsable: true,
          },
          {
            title: 'Quick Start Guide',
            path: '/de/quickstart/quickstart',
            collapsable: true,
            children: [
              '/de/quickstart/quickstart.md',
              '/de/quickstart/helloworld-localhost.md',
              '/de/quickstart/understanding-helloworld.md',
              '/de/quickstart/helloworld-hosted.md',
            ]
          },
          {
            title: 'Installation',
            path: '/de/install/install',
            collapsable: true,
            children: [
              '/de/install/install.md'
            ]
          },
          {
            title: 'Create a Project',
            path: '/de/create/introduction',
            collapsable: true,
            children: [
              '/de/create/introduction.md',
              '/de/create/manifest.md',
              '/de/create/graphql.md',
              '/de/create/mapping.md',
            ]
          },
          {
            title: 'Run a Project',
            path: '/de/run/run',
            collapsable: true,
            children: [
              '/de/run/run.md',
              '/de/run/sandbox.md',
            ]
          },
          {
            title: 'Publish a Project',
            path: '/de/publish/publish',
            collapsable: true,
            children: [
              '/de/publish/publish.md',
              '/de/publish/upgrade.md',
              '/de/publish/connect.md',
            ]
          },
          {
            title: 'Query your Data',
            path: '/de/query/query',
            collapsable: true,
            children: [
              '/de/query/query.md',
              '/de/query/graphql.md'
            ]
          },
          {
            title: 'Tutorials & Examples',
            path: '/de/tutorials_examples/introduction',
            collapsable: true,
            children: [
              '/de/tutorials_examples/introduction.md',
              '/de/tutorials_examples/block-height.md',
              '/de/tutorials_examples/batch-size.md',
              '/de/tutorials_examples/run-indexer.md',
              '/de/tutorials_examples/dictionary.md',
              '/de/tutorials_examples/debug-projects.md',
              '/de/tutorials_examples/terminology.md',
            ]
          },
          {
            title: 'FAQs',
            path: '/de/faqs/faqs',
            collapsable: true,
            children: [
              '/de/faqs/faqs.md',
            ]
          },
          {
            title: 'Miscellaneous',
            path: '/de/miscellaneous/contributing',
            collapsable: true,
            children: [
              '/de/miscellaneous/contributing.md',
              '/de/miscellaneous/social_media.md',
              '/de/miscellaneous/branding.md',
              '/de/miscellaneous/ambassadors.md',
            ]
          },
          {
            title: 'Reference Docs',
            path: '/de/references/references',
            collapsable: true,
            children: [
              '/de/references/references.md',
            ]
          }
        ],
      },
      /*
      "/es/": {
        sidebar: [
          {
            title: 'Welcome to SubQuery',
            path: '/es/',
            collapsable: true,
          },
          {
            title: 'Quick Start Guide',
            path: '/es/quickstart/quickstart',
            collapsable: true,
            children: [
              '/es/quickstart/quickstart.md',
              '/es/quickstart/helloworld-localhost.md',
              '/es/quickstart/understanding-helloworld.md',
              '/es/quickstart/helloworld-hosted.md',
            ]
          },
          {
            title: 'Installation',
            path: '/es/install/install',
            collapsable: true,
            children: [
              '/es/install/install.md'
            ]
          },
          {
            title: 'Create a Project',
            path: '/es/create/introduction',
            collapsable: true,
            children: [
              '/es/create/introduction.md',
              '/es/create/manifest.md',
              '/es/create/graphql.md',
              '/es/create/mapping.md',
            ]
          },
          {
            title: 'Run a Project',
            path: '/es/run/run',
            collapsable: true,
            children: [
              '/es/run/run.md',
              '/es/run/sandbox.md',
            ]
          },
          {
            title: 'Publish a Project',
            path: '/es/publish/publish',
            collapsable: true,
            children: [
              '/es/publish/publish.md',
              '/es/publish/upgrade.md',
              '/es/publish/connect.md',
            ]
          },
          {
            title: 'Query your Data',
            path: '/es/query/query',
            collapsable: true,
            children: [
              '/es/query/query.md',
              '/es/query/graphql.md'
            ]
          },
          {
            title: 'Tutorials & Examples',
            path: '/es/tutorials_examples/introduction',
            collapsable: true,
            children: [
              '/es/tutorials_examples/introduction.md',
              '/es/tutorials_examples/block-height.md',
              '/es/tutorials_examples/batch-size.md',
              '/es/tutorials_examples/run-indexer.md',
              '/es/tutorials_examples/dictionary.md',
              '/es/tutorials_examples/debug-projects.md',
              '/es/tutorials_examples/terminology.md',
            ]
          },
          {
            title: 'FAQs',
            path: '/es/faqs/faqs',
            collapsable: true,
            children: [
              '/es/faqs/faqs.md',
            ]
          },
          {
            title: 'Miscellaneous',
            path: '/es/miscellaneous/contributing',
            collapsable: true,
            children: [
              '/es/miscellaneous/contributing.md',
              '/es/miscellaneous/social_media.md',
              '/es/miscellaneous/branding.md',
              '/es/miscellaneous/ambassadors.md',
            ]
          },
          {
            title: 'Reference Docs',
            path: '/es/references/references',
            collapsable: true,
            children: [
              '/es/references/references.md',
            ]
          }
        ],
      },
      "/id/": {
        sidebar: [
          {
            title: 'Welcome to SubQuery',
            path: '/id/',
            collapsable: true,
          },
          {
            title: 'Quick Start Guide',
            path: '/id/quickstart/quickstart',
            collapsable: true,
            children: [
              '/id/quickstart/quickstart.md',
              '/id/quickstart/helloworld-localhost.md',
              '/id/quickstart/understanding-helloworld.md',
              '/id/quickstart/helloworld-hosted.md',
            ]
          },
          {
            title: 'Installation',
            path: '/id/install/install',
            collapsable: true,
            children: [
              '/id/install/install.md'
            ]
          },
          {
            title: 'Create a Project',
            path: '/id/create/introduction',
            collapsable: true,
            children: [
              '/id/create/introduction.md',
              '/id/create/manifest.md',
              '/id/create/graphql.md',
              '/id/create/mapping.md',
            ]
          },
          {
            title: 'Run a Project',
            path: '/id/run/run',
            collapsable: true,
            children: [
              '/id/run/run.md',
              '/id/run/sandbox.md',
            ]
          },
          {
            title: 'Publish a Project',
            path: '/id/publish/publish',
            collapsable: true,
            children: [
              '/id/publish/publish.md',
              '/id/publish/upgrade.md',
              '/id/publish/connect.md',
            ]
          },
          {
            title: 'Query your Data',
            path: '/id/query/query',
            collapsable: true,
            children: [
              '/id/query/query.md',
              '/id/query/graphql.md'
            ]
          },
          {
            title: 'Tutorials & Examples',
            path: '/id/tutorials_examples/introduction',
            collapsable: true,
            children: [
              '/id/tutorials_examples/introduction.md',
              '/id/tutorials_examples/block-height.md',
              '/id/tutorials_examples/batch-size.md',
              '/id/tutorials_examples/run-indexer.md',
              '/id/tutorials_examples/dictionary.md',
              '/id/tutorials_examples/debug-projects.md',
              '/id/tutorials_examples/terminology.md',
            ]
          },
          {
            title: 'FAQs',
            path: '/id/faqs/faqs',
            collapsable: true,
            children: [
              '/id/faqs/faqs.md',
            ]
          },
          {
            title: 'Miscellaneous',
            path: '/id/miscellaneous/contributing',
            collapsable: true,
            children: [
              '/id/miscellaneous/contributing.md',
              '/id/miscellaneous/social_media.md',
              '/id/miscellaneous/branding.md',
              '/id/miscellaneous/ambassadors.md',
            ]
          },
          {
            title: 'Reference Docs',
            path: '/id/references/references',
            collapsable: true,
            children: [
              '/id/references/references.md',
            ]
          }
        ],
      },
      "/it/": {
        sidebar: [
          {
            title: 'Welcome to SubQuery',
            path: '/it/',
            collapsable: true,
          },
          {
            title: 'Quick Start Guide',
            path: '/it/quickstart/quickstart',
            collapsable: true,
            children: [
              '/it/quickstart/quickstart.md',
              '/it/quickstart/helloworld-localhost.md',
              '/it/quickstart/understanding-helloworld.md',
              '/it/quickstart/helloworld-hosted.md',
            ]
          },
          {
            title: 'Installation',
            path: '/it/install/install',
            collapsable: true,
            children: [
              '/it/install/install.md'
            ]
          },
          {
            title: 'Create a Project',
            path: '/it/create/introduction',
            collapsable: true,
            children: [
              '/it/create/introduction.md',
              '/it/create/manifest.md',
              '/it/create/graphql.md',
              '/it/create/mapping.md',
            ]
          },
          {
            title: 'Run a Project',
            path: '/it/run/run',
            collapsable: true,
            children: [
              '/it/run/run.md',
              '/it/run/sandbox.md',
            ]
          },
          {
            title: 'Publish a Project',
            path: '/it/publish/publish',
            collapsable: true,
            children: [
              '/it/publish/publish.md',
              '/it/publish/upgrade.md',
              '/it/publish/connect.md',
            ]
          },
          {
            title: 'Query your Data',
            path: '/it/query/query',
            collapsable: true,
            children: [
              '/it/query/query.md',
              '/it/query/graphql.md'
            ]
          },
          {
            title: 'Tutorials & Examples',
            path: '/it/tutorials_examples/introduction',
            collapsable: true,
            children: [
              '/it/tutorials_examples/introduction.md',
              '/it/tutorials_examples/block-height.md',
              '/it/tutorials_examples/batch-size.md',
              '/it/tutorials_examples/run-indexer.md',
              '/it/tutorials_examples/dictionary.md',
              '/it/tutorials_examples/debug-projects.md',
              '/it/tutorials_examples/terminology.md',
            ]
          },
          {
            title: 'FAQs',
            path: '/it/faqs/faqs',
            collapsable: true,
            children: [
              '/it/faqs/faqs.md',
            ]
          },
          {
            title: 'Miscellaneous',
            path: '/it/miscellaneous/contributing',
            collapsable: true,
            children: [
              '/it/miscellaneous/contributing.md',
              '/it/miscellaneous/social_media.md',
              '/it/miscellaneous/branding.md',
              '/it/miscellaneous/ambassadors.md',
            ]
          },
          {
            title: 'Reference Docs',
            path: '/it/references/references',
            collapsable: true,
            children: [
              '/it/references/references.md',
            ]
          }
        ],
      },
      "/ja/": {
        sidebar: [
          {
            title: 'Welcome to SubQuery',
            path: '/ja/',
            collapsable: true,
          },
          {
            title: 'Quick Start Guide',
            path: '/ja/quickstart/quickstart',
            collapsable: true,
            children: [
              '/ja/quickstart/quickstart.md',
              '/ja/quickstart/helloworld-localhost.md',
              '/ja/quickstart/understanding-helloworld.md',
              '/ja/quickstart/helloworld-hosted.md',
            ]
          },
          {
            title: 'Installation',
            path: '/ja/install/install',
            collapsable: true,
            children: [
              '/ja/install/install.md'
            ]
          },
          {
            title: 'Create a Project',
            path: '/ja/create/introduction',
            collapsable: true,
            children: [
              '/ja/create/introduction.md',
              '/ja/create/manifest.md',
              '/ja/create/graphql.md',
              '/ja/create/mapping.md',
            ]
          },
          {
            title: 'Run a Project',
            path: '/ja/run/run',
            collapsable: true,
            children: [
              '/ja/run/run.md',
              '/ja/run/sandbox.md',
            ]
          },
          {
            title: 'Publish a Project',
            path: '/ja/publish/publish',
            collapsable: true,
            children: [
              '/ja/publish/publish.md',
              '/ja/publish/upgrade.md',
              '/ja/publish/connect.md',
            ]
          },
          {
            title: 'Query your Data',
            path: '/ja/query/query',
            collapsable: true,
            children: [
              '/ja/query/query.md',
              '/ja/query/graphql.md'
            ]
          },
          {
            title: 'Tutorials & Examples',
            path: '/ja/tutorials_examples/introduction',
            collapsable: true,
            children: [
              '/ja/tutorials_examples/introduction.md',
              '/ja/tutorials_examples/block-height.md',
              '/ja/tutorials_examples/batch-size.md',
              '/ja/tutorials_examples/run-indexer.md',
              '/ja/tutorials_examples/dictionary.md',
              '/ja/tutorials_examples/debug-projects.md',
              '/ja/tutorials_examples/terminology.md',
            ]
          },
          {
            title: 'FAQs',
            path: '/ja/faqs/faqs',
            collapsable: true,
            children: [
              '/ja/faqs/faqs.md',
            ]
          },
          {
            title: 'Miscellaneous',
            path: '/ja/miscellaneous/contributing',
            collapsable: true,
            children: [
              '/ja/miscellaneous/contributing.md',
              '/ja/miscellaneous/social_media.md',
              '/ja/miscellaneous/branding.md',
              '/ja/miscellaneous/ambassadors.md',
            ]
          },
          {
            title: 'Reference Docs',
            path: '/ja/references/references',
            collapsable: true,
            children: [
              '/ja/references/references.md',
            ]
          }
        ],
      },
      "/ko/": {
        sidebar: [
          {
            title: 'Welcome to SubQuery',
            path: '/ko/',
            collapsable: true,
          },
          {
            title: 'Quick Start Guide',
            path: '/ko/quickstart/quickstart',
            collapsable: true,
            children: [
              '/ko/quickstart/quickstart.md',
              '/ko/quickstart/helloworld-localhost.md',
              '/ko/quickstart/understanding-helloworld.md',
              '/ko/quickstart/helloworld-hosted.md',
            ]
          },
          {
            title: 'Installation',
            path: '/ko/install/install',
            collapsable: true,
            children: [
              '/ko/install/install.md'
            ]
          },
          {
            title: 'Create a Project',
            path: '/ko/create/introduction',
            collapsable: true,
            children: [
              '/ko/create/introduction.md',
              '/ko/create/manifest.md',
              '/ko/create/graphql.md',
              '/ko/create/mapping.md',
            ]
          },
          {
            title: 'Run a Project',
            path: '/ko/run/run',
            collapsable: true,
            children: [
              '/ko/run/run.md',
              '/ko/run/sandbox.md',
            ]
          },
          {
            title: 'Publish a Project',
            path: '/ko/publish/publish',
            collapsable: true,
            children: [
              '/ko/publish/publish.md',
              '/ko/publish/upgrade.md',
              '/ko/publish/connect.md',
            ]
          },
          {
            title: 'Query your Data',
            path: '/ko/query/query',
            collapsable: true,
            children: [
              '/ko/query/query.md',
              '/ko/query/graphql.md'
            ]
          },
          {
            title: 'Tutorials & Examples',
            path: '/ko/tutorials_examples/introduction',
            collapsable: true,
            children: [
              '/ko/tutorials_examples/introduction.md',
              '/ko/tutorials_examples/block-height.md',
              '/ko/tutorials_examples/batch-size.md',
              '/ko/tutorials_examples/run-indexer.md',
              '/ko/tutorials_examples/dictionary.md',
              '/ko/tutorials_examples/debug-projects.md',
              '/ko/tutorials_examples/terminology.md',
            ]
          },
          {
            title: 'FAQs',
            path: '/ko/faqs/faqs',
            collapsable: true,
            children: [
              '/ko/faqs/faqs.md',
            ]
          },
          {
            title: 'Miscellaneous',
            path: '/ko/miscellaneous/contributing',
            collapsable: true,
            children: [
              '/ko/miscellaneous/contributing.md',
              '/ko/miscellaneous/social_media.md',
              '/ko/miscellaneous/branding.md',
              '/ko/miscellaneous/ambassadors.md',
            ]
          },
          {
            title: 'Reference Docs',
            path: '/ko/references/references',
            collapsable: true,
            children: [
              '/ko/references/references.md',
            ]
          }
        ],
      },
      "/ru/": {
        sidebar: [
          {
            title: 'Welcome to SubQuery',
            path: '/ru/',
            collapsable: true,
          },
          {
            title: 'Quick Start Guide',
            path: '/ru/quickstart/quickstart',
            collapsable: true,
            children: [
              '/ru/quickstart/quickstart.md',
              '/ru/quickstart/helloworld-localhost.md',
              '/ru/quickstart/understanding-helloworld.md',
              '/ru/quickstart/helloworld-hosted.md',
            ]
          },
          {
            title: 'Installation',
            path: '/ru/install/install',
            collapsable: true,
            children: [
              '/ru/install/install.md'
            ]
          },
          {
            title: 'Create a Project',
            path: '/ru/create/introduction',
            collapsable: true,
            children: [
              '/ru/create/introduction.md',
              '/ru/create/manifest.md',
              '/ru/create/graphql.md',
              '/ru/create/mapping.md',
            ]
          },
          {
            title: 'Run a Project',
            path: '/ru/run/run',
            collapsable: true,
            children: [
              '/ru/run/run.md',
              '/ru/run/sandbox.md',
            ]
          },
          {
            title: 'Publish a Project',
            path: '/ru/publish/publish',
            collapsable: true,
            children: [
              '/ru/publish/publish.md',
              '/ru/publish/upgrade.md',
              '/ru/publish/connect.md',
            ]
          },
          {
            title: 'Query your Data',
            path: '/ru/query/query',
            collapsable: true,
            children: [
              '/ru/query/query.md',
              '/ru/query/graphql.md'
            ]
          },
          {
            title: 'Tutorials & Examples',
            path: '/ru/tutorials_examples/introduction',
            collapsable: true,
            children: [
              '/ru/tutorials_examples/introduction.md',
              '/ru/tutorials_examples/block-height.md',
              '/ru/tutorials_examples/batch-size.md',
              '/ru/tutorials_examples/run-indexer.md',
              '/ru/tutorials_examples/dictionary.md',
              '/ru/tutorials_examples/debug-projects.md',
              '/ru/tutorials_examples/terminology.md',
            ]
          },
          {
            title: 'FAQs',
            path: '/ru/faqs/faqs',
            collapsable: true,
            children: [
              '/ru/faqs/faqs.md',
            ]
          },
          {
            title: 'Miscellaneous',
            path: '/ru/miscellaneous/contributing',
            collapsable: true,
            children: [
              '/ru/miscellaneous/contributing.md',
              '/ru/miscellaneous/social_media.md',
              '/ru/miscellaneous/branding.md',
              '/ru/miscellaneous/ambassadors.md',
            ]
          },
          {
            title: 'Reference Docs',
            path: '/ru/references/references',
            collapsable: true,
            children: [
              '/ru/references/references.md',
            ]
          }
        ],
      },
      "/th/": {
        sidebar: [
          {
            title: 'Welcome to SubQuery',
            path: '/th/',
            collapsable: true,
          },
          {
            title: 'Quick Start Guide',
            path: '/th/quickstart/quickstart',
            collapsable: true,
            children: [
              '/th/quickstart/quickstart.md',
              '/th/quickstart/helloworld-localhost.md',
              '/th/quickstart/understanding-helloworld.md',
              '/th/quickstart/helloworld-hosted.md',
            ]
          },
          {
            title: 'Installation',
            path: '/th/install/install',
            collapsable: true,
            children: [
              '/th/install/install.md'
            ]
          },
          {
            title: 'Create a Project',
            path: '/th/create/introduction',
            collapsable: true,
            children: [
              '/th/create/introduction.md',
              '/th/create/manifest.md',
              '/th/create/graphql.md',
              '/th/create/mapping.md',
            ]
          },
          {
            title: 'Run a Project',
            path: '/th/run/run',
            collapsable: true,
            children: [
              '/th/run/run.md',
              '/th/run/sandbox.md',
            ]
          },
          {
            title: 'Publish a Project',
            path: '/th/publish/publish',
            collapsable: true,
            children: [
              '/th/publish/publish.md',
              '/th/publish/upgrade.md',
              '/th/publish/connect.md',
            ]
          },
          {
            title: 'Query your Data',
            path: '/th/query/query',
            collapsable: true,
            children: [
              '/th/query/query.md',
              '/th/query/graphql.md'
            ]
          },
          {
            title: 'Tutorials & Examples',
            path: '/th/tutorials_examples/introduction',
            collapsable: true,
            children: [
              '/th/tutorials_examples/introduction.md',
              '/th/tutorials_examples/block-height.md',
              '/th/tutorials_examples/batch-size.md',
              '/th/tutorials_examples/run-indexer.md',
              '/th/tutorials_examples/dictionary.md',
              '/th/tutorials_examples/debug-projects.md',
              '/th/tutorials_examples/terminology.md',
            ]
          },
          {
            title: 'FAQs',
            path: '/th/faqs/faqs',
            collapsable: true,
            children: [
              '/th/faqs/faqs.md',
            ]
          },
          {
            title: 'Miscellaneous',
            path: '/th/miscellaneous/contributing',
            collapsable: true,
            children: [
              '/th/miscellaneous/contributing.md',
              '/th/miscellaneous/social_media.md',
              '/th/miscellaneous/branding.md',
              '/th/miscellaneous/ambassadors.md',
            ]
          },
          {
            title: 'Reference Docs',
            path: '/th/references/references',
            collapsable: true,
            children: [
              '/th/references/references.md',
            ]
          }
        ],
      },
      "/tr/": {
        sidebar: [
          {
            title: 'Welcome to SubQuery',
            path: '/tr/',
            collapsable: true,
          },
          {
            title: 'Quick Start Guide',
            path: '/tr/quickstart/quickstart',
            collapsable: true,
            children: [
              '/tr/quickstart/quickstart.md',
              '/tr/quickstart/helloworld-localhost.md',
              '/tr/quickstart/understanding-helloworld.md',
              '/tr/quickstart/helloworld-hosted.md',
            ]
          },
          {
            title: 'Installation',
            path: '/tr/install/install',
            collapsable: true,
            children: [
              '/tr/install/install.md'
            ]
          },
          {
            title: 'Create a Project',
            path: '/tr/create/introduction',
            collapsable: true,
            children: [
              '/tr/create/introduction.md',
              '/tr/create/manifest.md',
              '/tr/create/graphql.md',
              '/tr/create/mapping.md',
            ]
          },
          {
            title: 'Run a Project',
            path: '/tr/run/run',
            collapsable: true,
            children: [
              '/tr/run/run.md',
              '/tr/run/sandbox.md',
            ]
          },
          {
            title: 'Publish a Project',
            path: '/tr/publish/publish',
            collapsable: true,
            children: [
              '/tr/publish/publish.md',
              '/tr/publish/upgrade.md',
              '/tr/publish/connect.md',
            ]
          },
          {
            title: 'Query your Data',
            path: '/tr/query/query',
            collapsable: true,
            children: [
              '/tr/query/query.md',
              '/tr/query/graphql.md'
            ]
          },
          {
            title: 'Tutorials & Examples',
            path: '/tr/tutorials_examples/introduction',
            collapsable: true,
            children: [
              '/tr/tutorials_examples/introduction.md',
              '/tr/tutorials_examples/block-height.md',
              '/tr/tutorials_examples/batch-size.md',
              '/tr/tutorials_examples/run-indexer.md',
              '/tr/tutorials_examples/dictionary.md',
              '/tr/tutorials_examples/debug-projects.md',
              '/tr/tutorials_examples/terminology.md',
            ]
          },
          {
            title: 'FAQs',
            path: '/tr/faqs/faqs',
            collapsable: true,
            children: [
              '/tr/faqs/faqs.md',
            ]
          },
          {
            title: 'Miscellaneous',
            path: '/tr/miscellaneous/contributing',
            collapsable: true,
            children: [
              '/tr/miscellaneous/contributing.md',
              '/tr/miscellaneous/social_media.md',
              '/tr/miscellaneous/branding.md',
              '/tr/miscellaneous/ambassadors.md',
            ]
          },
          {
            title: 'Reference Docs',
            path: '/tr/references/references',
            collapsable: true,
            children: [
              '/tr/references/references.md',
            ]
          }
        ],
      },
      "/uk/": {
        sidebar: [
          {
            title: 'Welcome to SubQuery',
            path: '/uk/',
            collapsable: true,
          },
          {
            title: 'Quick Start Guide',
            path: '/uk/quickstart/quickstart',
            collapsable: true,
            children: [
              '/uk/quickstart/quickstart.md',
              '/uk/quickstart/helloworld-localhost.md',
              '/uk/quickstart/understanding-helloworld.md',
              '/uk/quickstart/helloworld-hosted.md',
            ]
          },
          {
            title: 'Installation',
            path: '/uk/install/install',
            collapsable: true,
            children: [
              '/uk/install/install.md'
            ]
          },
          {
            title: 'Create a Project',
            path: '/uk/create/introduction',
            collapsable: true,
            children: [
              '/uk/create/introduction.md',
              '/uk/create/manifest.md',
              '/uk/create/graphql.md',
              '/uk/create/mapping.md',
            ]
          },
          {
            title: 'Run a Project',
            path: '/uk/run/run',
            collapsable: true,
            children: [
              '/uk/run/run.md',
              '/uk/run/sandbox.md',
            ]
          },
          {
            title: 'Publish a Project',
            path: '/uk/publish/publish',
            collapsable: true,
            children: [
              '/uk/publish/publish.md',
              '/uk/publish/upgrade.md',
              '/uk/publish/connect.md',
            ]
          },
          {
            title: 'Query your Data',
            path: '/uk/query/query',
            collapsable: true,
            children: [
              '/uk/query/query.md',
              '/uk/query/graphql.md'
            ]
          },
          {
            title: 'Tutorials & Examples',
            path: '/uk/tutorials_examples/introduction',
            collapsable: true,
            children: [
              '/uk/tutorials_examples/introduction.md',
              '/uk/tutorials_examples/block-height.md',
              '/uk/tutorials_examples/batch-size.md',
              '/uk/tutorials_examples/run-indexer.md',
              '/uk/tutorials_examples/dictionary.md',
              '/uk/tutorials_examples/debug-projects.md',
              '/uk/tutorials_examples/terminology.md',
            ]
          },
          {
            title: 'FAQs',
            path: '/uk/faqs/faqs',
            collapsable: true,
            children: [
              '/uk/faqs/faqs.md',
            ]
          },
          {
            title: 'Miscellaneous',
            path: '/uk/miscellaneous/contributing',
            collapsable: true,
            children: [
              '/uk/miscellaneous/contributing.md',
              '/uk/miscellaneous/social_media.md',
              '/uk/miscellaneous/branding.md',
              '/uk/miscellaneous/ambassadors.md',
            ]
          },
          {
            title: 'Reference Docs',
            path: '/uk/references/references',
            collapsable: true,
            children: [
              '/uk/references/references.md',
            ]
          }
        ],
      },
      */
      "/vi/": {
        sidebar: [
          {
            title: 'Welcome to SubQuery',
            path: '/vi/',
            collapsable: true,
          },
          {
            title: 'Quick Start Guide',
            path: '/vi/quickstart/quickstart',
            collapsable: true,
            children: [
              '/vi/quickstart/quickstart.md',
              '/vi/quickstart/helloworld-localhost.md',
              '/vi/quickstart/understanding-helloworld.md',
              '/vi/quickstart/helloworld-hosted.md',
            ]
          },
          {
            title: 'Installation',
            path: '/vi/install/install',
            collapsable: true,
            children: [
              '/vi/install/install.md'
            ]
          },
          {
            title: 'Create a Project',
            path: '/vi/create/introduction',
            collapsable: true,
            children: [
              '/vi/create/introduction.md',
              '/vi/create/manifest.md',
              '/vi/create/graphql.md',
              '/vi/create/mapping.md',
            ]
          },
          {
            title: 'Run a Project',
            path: '/vi/run/run',
            collapsable: true,
            children: [
              '/vi/run/run.md',
              '/vi/run/sandbox.md',
            ]
          },
          {
            title: 'Publish a Project',
            path: '/vi/publish/publish',
            collapsable: true,
            children: [
              '/vi/publish/publish.md',
              '/vi/publish/upgrade.md',
              '/vi/publish/connect.md',
            ]
          },
          {
            title: 'Query your Data',
            path: '/vi/query/query',
            collapsable: true,
            children: [
              '/vi/query/query.md',
              '/vi/query/graphql.md'
            ]
          },
          {
            title: 'Tutorials & Examples',
            path: '/vi/tutorials_examples/introduction',
            collapsable: true,
            children: [
              '/vi/tutorials_examples/introduction.md',
              '/vi/tutorials_examples/block-height.md',
              '/vi/tutorials_examples/batch-size.md',
              '/vi/tutorials_examples/run-indexer.md',
              '/vi/tutorials_examples/dictionary.md',
              '/vi/tutorials_examples/debug-projects.md',
              '/vi/tutorials_examples/terminology.md',
            ]
          },
          {
            title: 'FAQs',
            path: '/vi/faqs/faqs',
            collapsable: true,
            children: [
              '/vi/faqs/faqs.md',
            ]
          },
          {
            title: 'Miscellaneous',
            path: '/vi/miscellaneous/contributing',
            collapsable: true,
            children: [
              '/vi/miscellaneous/contributing.md',
              '/vi/miscellaneous/social_media.md',
              '/vi/miscellaneous/branding.md',
              '/vi/miscellaneous/ambassadors.md',
            ]
          },
          {
            title: 'Reference Docs',
            path: '/vi/references/references',
            collapsable: true,
            children: [
              '/vi/references/references.md',
            ]
          }
        ],
      },
      "/zh/": {
        sidebar: [
          {
            title: 'Welcome to SubQuery',
            path: '/zh/',
            collapsable: true,
          },
          {
            title: 'Quick Start Guide',
            path: '/zh/quickstart/quickstart',
            collapsable: true,
            children: [
              '/zh/quickstart/quickstart.md',
              '/zh/quickstart/helloworld-localhost.md',
              '/zh/quickstart/understanding-helloworld.md',
              '/zh/quickstart/helloworld-hosted.md',
            ]
          },
          {
            title: 'Installation',
            path: '/zh/install/install',
            collapsable: true,
            children: [
              '/zh/install/install.md'
            ]
          },
          {
            title: 'Create a Project',
            path: '/zh/create/introduction',
            collapsable: true,
            children: [
              '/zh/create/introduction.md',
              '/zh/create/manifest.md',
              '/zh/create/graphql.md',
              '/zh/create/mapping.md',
            ]
          },
          {
            title: 'Run a Project',
            path: '/zh/run/run',
            collapsable: true,
            children: [
              '/zh/run/run.md',
              '/zh/run/sandbox.md',
            ]
          },
          {
            title: 'Publish a Project',
            path: '/zh/publish/publish',
            collapsable: true,
            children: [
              '/zh/publish/publish.md',
              '/zh/publish/upgrade.md',
              '/zh/publish/connect.md',
            ]
          },
          {
            title: 'Query your Data',
            path: '/zh/query/query',
            collapsable: true,
            children: [
              '/zh/query/query.md',
              '/zh/query/graphql.md'
            ]
          },
          {
            title: 'Tutorials & Examples',
            path: '/zh/tutorials_examples/introduction',
            collapsable: true,
            children: [
              '/zh/tutorials_examples/introduction.md',
              '/zh/tutorials_examples/block-height.md',
              '/zh/tutorials_examples/batch-size.md',
              '/zh/tutorials_examples/run-indexer.md',
              '/zh/tutorials_examples/dictionary.md',
              '/zh/tutorials_examples/debug-projects.md',
              '/zh/tutorials_examples/terminology.md',
            ]
          },
          {
            title: 'FAQs',
            path: '/zh/faqs/faqs',
            collapsable: true,
            children: [
              '/zh/faqs/faqs.md',
            ]
          },
          {
            title: 'Miscellaneous',
            path: '/zh/miscellaneous/contributing',
            collapsable: true,
            children: [
              '/zh/miscellaneous/contributing.md',
              '/zh/miscellaneous/social_media.md',
              '/zh/miscellaneous/branding.md',
              '/zh/miscellaneous/ambassadors.md',
            ]
          },
          {
            title: 'Reference Docs',
            path: '/zh/references/references',
            collapsable: true,
            children: [
              '/zh/references/references.md',
            ]
          }
        ],
      },
    }
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
