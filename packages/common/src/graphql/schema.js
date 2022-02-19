"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSchemaFromDocumentNode = exports.buildSchemaFromString = exports.buildSchemaFromFile = void 0;
const fs_1 = __importDefault(require("fs"));
const graphql_1 = require("graphql");
const directives_1 = require("./schema/directives");
const scalas_1 = require("./schema/scalas");
function loadBaseSchema() {
    const schema = (0, graphql_1.buildASTSchema)(scalas_1.scalas);
    return (0, graphql_1.extendSchema)(schema, directives_1.directives);
}
function buildSchemaFromFile(path) {
    return buildSchemaFromString(fs_1.default.readFileSync(path).toString());
}
exports.buildSchemaFromFile = buildSchemaFromFile;
function buildSchemaFromString(raw) {
    const src = new graphql_1.Source(raw);
    const doc = (0, graphql_1.parse)(src);
    return buildSchemaFromDocumentNode(doc);
}
exports.buildSchemaFromString = buildSchemaFromString;
function buildSchemaFromDocumentNode(doc) {
    return (0, graphql_1.extendSchema)(loadBaseSchema(), doc);
}
exports.buildSchemaFromDocumentNode = buildSchemaFromDocumentNode;
//# sourceMappingURL=schema.js.map