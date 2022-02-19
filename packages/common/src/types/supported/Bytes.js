"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bytes = void 0;
const util_1 = require("@polkadot/util");
const sequelize_1 = require("sequelize");
const TypeClass_1 = require("../TypeClass");
exports.Bytes = new TypeClass_1.TypeClass('Bytes', (data) => {
    if (data instanceof Uint8Array)
        return data;
    if ((0, util_1.isHex)(data)) {
        return (0, util_1.hexToU8a)(data);
    }
    throw new Error(`can not hash ${data}`);
}, 'string', 'Bytes', sequelize_1.DataTypes.BLOB);
//# sourceMappingURL=Bytes.js.map