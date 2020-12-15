# Define the SubQuery



## The Manifest
Inside the `project.yaml`, defines the substrate extrinsic your subquery indexes, which events \ calls 
from these extrinsic to pay attention to, and how to map event data to entities that our hosted node will
stores and allows to query. 

## The GraphQL Schema

- Next, you need to define the GraphQL schemas inside of `schema.graphql` file. To know how to write in  "GraphQL schema language",
we recommend to check out on [Schemas and Types](https://graphql.org/learn/schema/#type-language).


## Mapping function

The mappings transform the substrate data your mappings are sourcing into entities defined in your schema. Mappings are written 
in a subset of TypeScript called AssemblyScript which can be compiled to WASM (WebAssembly). 

- We also provided an example of a mapping function in `src/mappings/Extrinsic.ts`. For each handler that is defined in `project.yaml`
under mapping.handlers, create an exported function of the same name. 

- Under the `src/index.ts`，you need to export the functions of handlers has defined in above.


### BlockHandler
### EventHandler


## Code Generation

```
$subql codegen
```
- This will create a new directory `src/types` which contains all generated entities in AssemblyScript.
- Generated entity class for each types you have defined previously in `schema.graphql`. These classes provide type-safe 
entity loading, read and write access to entity fields.
