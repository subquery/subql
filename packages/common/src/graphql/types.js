"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldScalar = exports.IndexType = void 0;
var IndexType;
(function (IndexType) {
    IndexType["BTREE"] = "btree";
    IndexType["HASH"] = "hash";
    IndexType["GIST"] = "gist";
    IndexType["SPGIST"] = "spgist";
    IndexType["GIN"] = "gin";
    IndexType["BRIN"] = "brin";
})(IndexType = exports.IndexType || (exports.IndexType = {}));
var FieldScalar;
(function (FieldScalar) {
    FieldScalar["ID"] = "ID";
    FieldScalar["Int"] = "Int";
    FieldScalar["BigInt"] = "BigInt";
    FieldScalar["String"] = "String";
    FieldScalar["Date"] = "Date";
    FieldScalar["Boolean"] = "Boolean";
    FieldScalar["Bytes"] = "Bytes";
    FieldScalar["Float"] = "Float";
})(FieldScalar = exports.FieldScalar || (exports.FieldScalar = {}));
//# sourceMappingURL=types.js.map