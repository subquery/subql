"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateObj = void 0;
const assert_1 = __importDefault(require("assert"));
const util_1 = require("@polkadot/util");
const TypeClass_1 = require("../TypeClass");
exports.DateObj = new TypeClass_1.TypeClass('Date', (data) => {
    (0, assert_1.default)(data instanceof Date, `can not hash ${data}, expect instance of Date`);
    return (0, util_1.numberToU8a)(data.getTime());
}, 'Date', 'Date', 'timestamp');
//# sourceMappingURL=Date.js.map