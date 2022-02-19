"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.Float = void 0;
const sequelize_1 = require("sequelize");
const TypeClass_1 = require("../TypeClass");
exports.Float = new TypeClass_1.TypeClass('Float', (data) => {
    //TODO, check if this is proper way to handle float
    return Buffer.from(data.toString());
}, 'number', 'Float', sequelize_1.DataTypes.FLOAT);
//# sourceMappingURL=Float.js.map