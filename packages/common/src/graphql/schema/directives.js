"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.directives = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.directives = (0, graphql_tag_1.default) `
  directive @derivedFrom(field: String!) on FIELD_DEFINITION
  directive @entity on OBJECT
  directive @jsonField on OBJECT
  directive @index(unique: Boolean) on FIELD_DEFINITION
`;
//# sourceMappingURL=directives.js.map