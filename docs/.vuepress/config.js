module.exports = {
    base: "/subql/",
    lastUpdated: 'Last Updated',

    locales: {
        '/': {
            lang: 'English',
            title: 'SubQuery',
            description: 'SubQuery is a open-source tool to provide a complete process and query data solution to every substrate project and will become core infrastructure for the Polkadot ecosystem.'
        },
        '/zh/': {
            lang: '中文',
            title: 'SubQuery',
            description: 'SubQuery是一个开源工具，可以为每一个substrate项目提供完整的处理和查询解决方案，并将成为Polkadot生态系统的核心基础架构。',
        }
    },

    themeConfig: {
        locales: {
            '/': {
                selectText: 'Languages',
                label: 'English',
                ariaLabel: 'Languages',
                algolia: {},
                nav: [
                    { text: 'Guide', link: '/' },
                    { text: 'OnFinality', link: 'https://onfinality.io/', target:'_self', rel:''},
                ],
                sidebar: {
                    '/': [
                        '',
                        'quickstart',
                        'directory_structure',
                        'define_a_subquery' ,
                        'deploy',
                        'query_the_project',
                        'qna'
                    ]
                }

            },
            '/zh/': {

                selectText: '选择语言',
                label: '简体中文',
                algolia: {},
                nav: [
                    { text: '项目指南', link: '/zh/' },
                    { text: 'OnFinality', link: 'https://onfinality.io/', target:'_self', rel:''},

                ],
                sidebar: {
                    '/zh/': [
                        '',
                        'quickstart',
                        'directory_structure',
                        'define_a_subquery' ,
                        'deploy',
                        'query_the_project',
                        'qna'
                    ]
                }
            }
        }
    }

}


