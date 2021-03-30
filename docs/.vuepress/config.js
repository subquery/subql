module.exports = {

    locales: {
        '/': {
            lang: 'English',
            title: 'SubQuery Guide',
            description: 'SubQuery is a open-source tool to provide a complete process and query data solution to every substrate project and will become core infrastructure for the Polkadot ecosystem.'
        },
    },

    themeConfig: {
        logo:'/assets/img/logo.png',
        logoLink: 'https://subquery.network',
        lastUpdated: 'Last Updated',
        locales: {
            '/': {
                selectText: 'Languages',
                label: 'English',
                ariaLabel: 'Languages',
                algolia: {},
                nav: [
                    { text: 'Explorer', link: 'https://explorer.subquery.network/',target:'_blank', rel:''},
                    { text: 'Documentation', link: '/' },
                    { text: 'GitHub', link: 'https://github.com/subquery/subql', target:'_blank', rel:''},
                ],
                sidebar: {
                    '/': [
                        '',
                        'quickstart',
                        {
                            title: 'Create a Project',
                            collapsable: false,
                            children: [
                                'create/define_a_subquery',
                                'create/directory_structure',
                            ]
                        },
                        {
                            title: 'Run a Project',
                            collapsable: false,
                            children: [
                                'run/indexing_query',
                                'run/sandbox',
                            ]
                        },
                        {
                            title: 'Publish a Project',
                            collapsable: false,
                            children: [
                                'publish/publish',
                                'publish/upgrade',
                            ]
                        },
                    ],
                }

            },
        },
        sidebarDepth: 2
    }

}


