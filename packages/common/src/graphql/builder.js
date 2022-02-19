"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildQuery = void 0;
function buildArgs(args) {
    return Object.keys(args)
        .map((argKey) => {
        const argValue = args[argKey];
        if (typeof argValue === 'string') {
            return `${argKey}:${argValue}`;
        }
        else if (argValue instanceof Array) {
            return `${argKey}:[${argValue
                .map((nested) => {
                if (typeof nested === 'string') {
                    return nested;
                }
                else if (nested instanceof Array) {
                    throw new Error('not supported');
                }
                else if (typeof nested === 'object') {
                    return `{${buildArgs(nested)}}`;
                }
                throw new Error('not supported');
            })
                .join(',')}]`;
        }
        else if (typeof argValue === 'object') {
            return `${argKey}:{${buildArgs(argValue)}}`;
        }
        else {
            throw new Error('graphql args not supported');
        }
    })
        .join(',');
}
const bindProjections = (node) => {
    return `${node.entity} ${node.args ? `(${buildArgs(node.args)})` : ``}${node.project
        ? `{${node.project
            .map((el) => {
            if (typeof el === 'string') {
                return `${el} `;
            }
            return `${bindProjections(el)} `;
        })
            .join('')}} `
        : ``}`;
};
const toVarDefs = (vars) => {
    return vars && vars.length ? `(${vars.map((item) => `$${item.name}:${item.gqlType}`)})` : ``;
};
const toVariables = (vars) => vars.reduce((acc, v) => {
    if (acc[v.name]) {
        throw new Error(`Graphql variables conflicts $${v.name}`);
    }
    acc[v.name] = v.value;
    return acc;
}, {});
function buildQuery(vars, nodes) {
    return {
        query: `query${toVarDefs(vars)}{${nodes.map((node) => bindProjections(node)).join(' ')}}`,
        variables: toVariables(vars),
    };
}
exports.buildQuery = buildQuery;
//# sourceMappingURL=builder.js.map