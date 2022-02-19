"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.ID = void 0;
const TypeClass_1 = require("../TypeClass");
exports.ID = new TypeClass_1.TypeClass('ID', (data) => {
    return Buffer.from(data);
}, 'string', 'ID', 'text');
//# sourceMappingURL=ID.js.map