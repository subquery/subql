
module.exports = {
    selectLanguageName: "German",
    sidebar: [
    {
      title: 'Welcome to SubQuery',
      path: `/de`,
      collapsable: true,
    },
    {
      title: 'Quick Start Guide',
      path: `/de/quickstart/quickstart`,
      collapsable: true,
      children: [
        `/de/quickstart/quickstart.md`,
        `/de/quickstart/helloworld-localhost.md`,
        `/de/quickstart/understanding-helloworld.md`,
        `/de/quickstart/helloworld-hosted.md`,
      ]
    },
    {
      title: 'Installation',
      path: `/de/install/install`,
      collapsable: true,
      children: [
        `/de/install/install.md`
      ]
    },
    {
      title: 'Create a Project',
      path: `/de/create/introduction`,
      collapsable: true,
      children: [
        `/de/create/introduction.md`,
        `/de/create/manifest.md`,
        `/de/create/graphql.md`,
        `/de/create/mapping.md`,
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
        '/de/tutorials_examples/introduction',
        '/de/tutorials_examples/block-height.md',
        '/de/tutorials_examples/batch-size.md',
        '/de/tutorials_examples/run-indexer.md',
        '/de/tutorials_examples/dictionary.md',
        '/de/tutorials_examples/debug-projects.md',
        '/de/tutorials_examples/terminology.md',
      ]
    },
    {
      title: 'The Hero Course',
      path: '/de/academy/herocourse',
      collapsable: true,
      children: [
        '/de/academy/herocourse/',
        '/de/academy/herocourse/module1.md',
        '/de/academy/herocourse/module2.md',
        '/de/academy/herocourse/module3.md',
        '/de/academy/herocourse/module4.md',
        '/de/academy/herocourse/module5.md',
        '/de/academy/herocourse/module6.md',
      ]
    },
    {
      title: 'FAQs',
      path: '/de/faqs/faqs.md',
      collapsable: true,
      children: []
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
      title: 'References',
      path: '/de/references/references',
      collapsable: true,
      children: [
        '/de/references/references.md',
      ]
    }
  ]}