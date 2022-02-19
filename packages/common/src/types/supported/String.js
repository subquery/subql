"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.String = void 0;
const TypeClass_1 = require("../TypeClass");
exports.String = new TypeClass_1.TypeClass('String', (data) => {
    return Buffer.from(data);
}, 'string', 'String', 'text');
//# sourceMappingURL=String.js.map