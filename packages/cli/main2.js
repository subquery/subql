const {loadDocuments, loadSchema} = require('@graphql-tools/load');
const {GraphQLFileLoader} = require('@graphql-tools/graphql-file-loader');

async function main() {
  const document = await loadDocuments('schema.graphql', {
    loaders: [new GraphQLFileLoader()],
  });
}

main();
