
module.exports = {
    selectLanguageName: "Chinese",
    sidebar: [
    {
      title: 'Welcome to SubQuery',
      path: `/zh`,
      collapsable: true,
    },
    {
      title: 'Quick Start Guide',
      path: `/zh/quickstart/quickstart`,
      collapsable: true,
      children: [
        `/zh/quickstart/quickstart.md`,
        `/zh/quickstart/helloworld-localhost.md`,
        `/zh/quickstart/understanding-helloworld.md`,
        `/zh/quickstart/helloworld-hosted.md`,
      ]
    },
    {
      title: 'Installation',
      path: `/zh/install/install`,
      collapsable: true,
      children: [
        `/zh/install/install.md`
      ]
    },
    {
      title: 'Create a Project',
      path: `/zh/create/introduction`,
      collapsable: true,
      children: [
        `/zh/create/introduction.md`,
        `/zh/create/manifest.md`,
        `/zh/create/graphql.md`,
        `/zh/create/mapping.md`,
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
        '/zh/tutorials_examples/introduction',
        '/zh/tutorials_examples/block-height.md',
        '/zh/tutorials_examples/batch-size.md',
        '/zh/tutorials_examples/run-indexer.md',
        '/zh/tutorials_examples/dictionary.md',
        '/zh/tutorials_examples/debug-projects.md',
        '/zh/tutorials_examples/terminology.md',
      ]
    },
    {
      title: 'The Hero Course',
      path: '/zh/academy/herocourse',
      collapsable: true,
      children: [
        '/zh/academy/herocourse/',
        '/zh/academy/herocourse/module1.md',
        '/zh/academy/herocourse/module2.md',
        '/zh/academy/herocourse/module3.md',
        '/zh/academy/herocourse/module4.md',
        '/zh/academy/herocourse/module5.md',
        '/zh/academy/herocourse/module6.md',
      ]
    },
    {
      title: 'FAQs',
      path: '/zh/faqs/faqs.md',
      collapsable: true,
      children: []
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
      title: 'References',
      path: '/zh/references/references',
      collapsable: true,
      children: [
        '/zh/references/references.md',
      ]
    }
  ]}