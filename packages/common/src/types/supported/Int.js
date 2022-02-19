"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.Int = void 0;
const util_1 = require("@polkadot/util");
const TypeClass_1 = require("../TypeClass");
exports.Int = new TypeClass_1.TypeClass('Int', (data) => {
    return (0, util_1.numberToU8a)(data);
}, 'number', 'Int', 'integer');
//# sourceMappingURL=Int.js.map