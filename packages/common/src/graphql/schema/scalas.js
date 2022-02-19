"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scalas = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.scalas = (0, graphql_tag_1.default) `
  scalar BigInt
  scalar BigDecimal
  scalar Date
  scalar Bytes
  scalar Float
`;
//# sourceMappingURL=scalas.js.map