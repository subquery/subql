// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {ApolloServerPlugin, GraphQLServerListener} from 'apollo-server-plugin-base';

export function playgroundPlugin(options: {url: string; subscriptionUrl?: string}): ApolloServerPlugin {
  return {
    // eslint-disable-next-line @typescript-eslint/require-await
    async serverWillStart(): Promise<GraphQLServerListener> {
      return {
        // eslint-disable-next-line @typescript-eslint/require-await
        async renderLandingPage() {
          // This content is sourced from https://github.com/graphql/graphiql/blob/main/examples/graphiql-cdn/index.html
          return {
            html: `<!--
             *  Copyright (c) 2025 GraphQL Contributors
             *  All rights reserved.
             *
             *  This source code is licensed under the license found in the
             *  LICENSE file in the root directory of this source tree.
            -->
            <!doctype html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>GraphiQL 5 with React 19 and GraphiQL Explorer</title>
                <style>
                  body {
                    margin: 0;
                  }

                  #graphiql {
                    height: 100dvh;
                  }

                  .loading {
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 4rem;
                  }
                </style>
                <link rel="stylesheet" href="https://esm.sh/graphiql/dist/style.css" />
                <link
                  rel="stylesheet"
                  href="https://esm.sh/@graphiql/plugin-explorer/dist/style.css"
                />
                <!-- Note: the ?standalone flag bundles the module along with all of its 'dependencies', excluding peerDependencies', into a single JavaScript file. -->
                <script type="importmap">
                  {
                    "imports": {
                      "react": "https://esm.sh/react@19.1.0",
                      "react/jsx-runtime": "https://esm.sh/react@19.1.0/jsx-runtime",

                      "react-dom": "https://esm.sh/react-dom@19.1.0",
                      "react-dom/client": "https://esm.sh/react-dom@19.1.0/client",

                      "graphiql": "https://esm.sh/graphiql?standalone&external=react,react-dom,@graphiql/react,graphql",
                      "@graphiql/plugin-explorer": "https://esm.sh/@graphiql/plugin-explorer?standalone&external=react,@graphiql/react,graphql",
                      "@graphiql/react": "https://esm.sh/@graphiql/react?standalone&external=react,react-dom,graphql",

                      "@graphiql/toolkit": "https://esm.sh/@graphiql/toolkit?standalone&external=graphql",
                      "graphql": "https://esm.sh/graphql@16.11.0"
                    }
                  }
                </script>
                <script type="module">
                  // Import React and ReactDOM
                  import React from 'react';
                  import ReactDOM from 'react-dom/client';
                  // Import GraphiQL and the Explorer plugin
                  import { GraphiQL, HISTORY_PLUGIN } from 'graphiql';
                  import { createGraphiQLFetcher } from '@graphiql/toolkit';
                  import { explorerPlugin } from '@graphiql/plugin-explorer';

                  import createJSONWorker from 'https://esm.sh/monaco-editor/esm/vs/language/json/json.worker.js?worker';
                  import createGraphQLWorker from 'https://esm.sh/monaco-graphql/esm/graphql.worker.js?worker';
                  import createEditorWorker from 'https://esm.sh/monaco-editor/esm/vs/editor/editor.worker.js?worker';

                  globalThis.MonacoEnvironment = {
                    getWorker(_workerId, label) {
                      console.info('MonacoEnvironment.getWorker', { label });
                      switch (label) {
                        case 'json':
                          return createJSONWorker();
                        case 'graphql':
                          return createGraphQLWorker();
                      }
                      return createEditorWorker();
                    },
                  };

                  const fetcher = createGraphiQLFetcher(${JSON.stringify(options)});
                  const plugins = [HISTORY_PLUGIN, explorerPlugin()];

                  function App() {
                    return React.createElement(GraphiQL, {
                      fetcher,
                      plugins,
                      defaultEditorToolsVisibility: true,
                    });
                  }

                  const container = document.getElementById('graphiql');
                  const root = ReactDOM.createRoot(container);
                  root.render(React.createElement(App));
                </script>
              </head>
              <body>
                <div id="graphiql">
                  <div class="loading">Loading…</div>
                </div>
              </body>
            </html>`,
          };
        },
      };
    },
  };
}
