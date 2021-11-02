
module.exports = {
    selectLanguageName: "Vietnamese",
    sidebar: [
    {
      title: 'Welcome to SubQuery',
      path: `/vi`,
      collapsable: true,
    },
    {
      title: 'Quick Start Guide',
      path: `/vi/quickstart/quickstart`,
      collapsable: true,
      children: [
        `/vi/quickstart/quickstart.md`,
        `/vi/quickstart/helloworld-localhost.md`,
        `/vi/quickstart/understanding-helloworld.md`,
        `/vi/quickstart/helloworld-hosted.md`,
      ]
    },
    {
      title: 'Installation',
      path: `/vi/install/install`,
      collapsable: true,
      children: [
        `/vi/install/install.md`
      ]
    },
    {
      title: 'Create a Project',
      path: `/vi/create/introduction`,
      collapsable: true,
      children: [
        `/vi/create/introduction.md`,
        `/vi/create/manifest.md`,
        `/vi/create/graphql.md`,
        `/vi/create/mapping.md`,
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
        '/vi/tutorials_examples/introduction',
        '/vi/tutorials_examples/block-height.md',
        '/vi/tutorials_examples/batch-size.md',
        '/vi/tutorials_examples/run-indexer.md',
        '/vi/tutorials_examples/dictionary.md',
        '/vi/tutorials_examples/debug-projects.md',
        '/vi/tutorials_examples/terminology.md',
      ]
    },
    {
      title: 'The Hero Course',
      path: '/vi/academy/herocourse',
      collapsable: true,
      children: [
        '/vi/academy/herocourse/',
        '/vi/academy/herocourse/module1.md',
        '/vi/academy/herocourse/module2.md',
        '/vi/academy/herocourse/module3.md',
        '/vi/academy/herocourse/module4.md',
        '/vi/academy/herocourse/module5.md',
        '/vi/academy/herocourse/module6.md',
      ]
    },
    {
      title: 'FAQs',
      path: '/vi/faqs/faqs.md',
      collapsable: true,
      children: []
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
      title: 'References',
      path: '/vi/references/references',
      collapsable: true,
      children: [
        '/vi/references/references.md',
      ]
    }
  ]}