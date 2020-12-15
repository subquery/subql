module.exports = {
    base: "/subweb/",
    lastUpdated: 'Last Updated', // string | boolean

    locales: {
        // 键名是该语言所属的子路径
        // 作为特例，默认语言可以使用 '/' 作为其路径。
        '/': {
            lang: 'English', // 将会被设置为 <html> 的 lang 属性
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
                        '',     /* /guide/ */
                        'quickstart',  /* /guide/one.html */
                        'directory_structure',  /* /guide/directory_structure.html */
                        'define_a_subquery' , /* /guide/define_a_subquery.html */
                        'deploy',  /* /guide/deploy.html */
                        'query_the_project',   /* /guide/deploy.html */
                        'qna'


                    ]
                }

            },
            '/zh/': {
                // 多语言下拉菜单的标题
                selectText: '选择语言',
                // 该语言在下拉菜单中的标签
                label: '简体中文',
                // 当前 locale 的 algolia docsearch 选项
                algolia: {},
                nav: [
                    { text: '项目指南', link: '/zh/' },
                    { text: 'OnFinality', link: 'https://onfinality.io/', target:'_self', rel:''},

                ],
                sidebar: {
                    '/zh/': [
                        '',     /* /guide/ */
                        'quickstart',  /* /guide/one.html */
                        'directory_structure',  /* /guide/one.html */
                        'two'   /* /guide/two.html */
                    ]
                }
            }
        }
    }

}


