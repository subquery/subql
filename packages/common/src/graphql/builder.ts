// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface GqlVar {
  name: string;
  gqlType: string;
  value: unknown;
}

export interface GqlNode {
  // type?: "interface" | "union";
  entity: string;
  project?: Array<GqlNode | string>;
  args?: Record<string, unknown>;
}

export interface GqlQuery {
  query: string;
  variables: Record<string, unknown>;
}

function buildArgs(args: Record<string, unknown>): string {
  return Object.keys(args)
    .map((argKey) => {
      const argValue = args[argKey];
      if (typeof argValue === 'string') {
        return `${argKey}:${argValue}`;
      } else if (argValue instanceof Array) {
        return `${argKey}:[${argValue
          .map((nested) => {
            if (typeof nested === 'string') {
              return nested;
            } else if (nested instanceof Array) {
              throw new Error('not supported');
            } else if (typeof nested === 'object') {
              return `{${buildArgs(nested)}}`;
            }
            throw new Error('not supported');
          })
          .join(',')}]`;
      } else if (typeof argValue === 'object') {
        return `${argKey}:{${buildArgs(argValue as Record<string, unknown>)}}`;
      } else {
        throw new Error('graphql args not supported');
      }
    })
    .join(',');
}

const bindProjections = (node: GqlNode): string => {
  return `${node.entity} ${node.args ? `(${buildArgs(node.args)})` : ``}${
    node.project
      ? `{${node.project
          .map((el: GqlNode | string) => {
            if (typeof el === 'string') {
              return `${el} `;
            }
            return `${bindProjections(el)} `;
          })
          .join('')}} `
      : ``
  }`;
};

const toVarDefs = (vars: GqlVar[]): string => {
  return vars && vars.length ? `(${vars.map((item) => `$${item.name}:${item.gqlType}`)})` : ``;
};

const toVariables = (vars: GqlVar[]) =>
  vars.reduce((acc, v) => {
    if (acc[v.name]) {
      throw new Error(`Graphql variables conflicts $${v.name}`);
    }
    acc[v.name] = v.value;
    return acc;
  }, {} as Record<string, unknown>);

export function buildQuery(vars: GqlVar[], nodes: GqlNode[]): GqlQuery {
  return {
    query: `query${toVarDefs(vars)}{${nodes.map((node) => bindProjections(node)).join(' ')}}`,
    variables: toVariables(vars),
  };
}
