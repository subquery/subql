"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BigInt = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const TypeClass_1 = require("../TypeClass");
exports.BigInt = new TypeClass_1.TypeClass('BigInt', (data) => {
    return new bn_js_1.default(data.toString()).toBuffer();
}, 'bigint', 'BigInt', 'numeric');
//# sourceMappingURL=BigInt.js.map