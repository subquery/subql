"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.Json = void 0;
const sequelize_1 = require("sequelize");
const TypeClass_1 = require("../TypeClass");
exports.Json = new TypeClass_1.TypeClass('Json', (data) => {
    return Buffer.from(JSON.stringify(data));
}, undefined, undefined, sequelize_1.DataTypes.JSONB);
//# sourceMappingURL=Json.js.map