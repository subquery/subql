
module.exports = {
    selectLanguageName: "English",
    sidebar: [
    {
      title: 'Welcome to SubQuery',
      path: `/`,
      collapsable: true,
    },
    {
      title: 'Quick Start Guide',
      path: `/quickstart/quickstart`,
      collapsable: true,
      children: [
        `/quickstart/quickstart.md`,
        `/quickstart/helloworld-localhost.md`,
        `/quickstart/understanding-helloworld.md`,
        `/quickstart/helloworld-hosted.md`,
      ]
    },
    {
      title: 'Installation',
      path: `/install/install`,
      collapsable: true,
      children: [
        `/install/install.md`
      ]
    },
    {
      title: 'Create a Project',
      path: `/create/introduction`,
      collapsable: true,
      children: [
        `/create/introduction.md`,
        `/create/manifest.md`,
        `/create/graphql.md`,
        `/create/mapping.md`,
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
      title: 'The Hero Course',
      path: '/academy/herocourse',
      collapsable: true,
      children: [
        '/academy/herocourse/',
        '/academy/herocourse/module1.md',
        '/academy/herocourse/module2.md',
        '/academy/herocourse/module3.md',
        '/academy/herocourse/module4.md',
        '/academy/herocourse/module5.md',
        '/academy/herocourse/module6.md',
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
  ]}