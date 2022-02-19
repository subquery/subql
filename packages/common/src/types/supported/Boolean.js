"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.Boolean = void 0;
const util_1 = require("@polkadot/util");
const TypeClass_1 = require("../TypeClass");
exports.Boolean = new TypeClass_1.TypeClass('Boolean', (data) => {
    return (0, util_1.numberToU8a)(data ? 1 : 0);
}, 'boolean', 'Boolean', 'boolean');
//# sourceMappingURL=Boolean.js.map