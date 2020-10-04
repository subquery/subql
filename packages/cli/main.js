const fs = require('fs');
const {Source, parse, visit, buildSchema, extendSchema} = require('graphql');

const s = new Source(fs.readFileSync('./schema.graphql').toString());

const base = buildSchema(new Source(fs.readFileSync('./base.graphql').toString()));

const doc = parse(s);
const sc = extendSchema(base, doc)

visit(doc, {
  enter(node, key, parent, path, ancestors) {
    console.log(`enter ${node.kind}`);
    if (node.kind === 'ObjectTypeDefinition') {
      console.log(node.name.value);
    }
  },
  leave(node, key, parent, path, ancestors) {
    console.log(`leave ${node.kind}`);
  },
})
