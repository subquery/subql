module.exports = {

    locales: {
        '/': {
            lang: 'English',
            title: 'SubQuery',
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
                    { text: 'Home', link: 'https://www.subquery.network/',target:'_self', rel:''},
                    { text: 'Guide', link: '/' },
                    { text: 'OnFinality', link: 'https://onfinality.io/', target:'_self', rel:''},
                ],
                sidebar: {
                    '/': [
                        '',
                        'quickstart',
                        'directory_structure',
                        'define_a_subquery' ,
                        'indexing_query',
                        'sandbox'

                    ],
                }

            },
        },
        sidebarDepth: 2
    }

}


