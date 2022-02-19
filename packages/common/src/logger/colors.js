"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorizeLevel = exports.ctx = void 0;
const chalk_1 = __importDefault(require("chalk"));
const constants_1 = require("./constants");
exports.ctx = new chalk_1.default.Instance({ level: 3 });
const colored = {
    default: exports.ctx.white,
    60: exports.ctx.bgRed,
    50: exports.ctx.red,
    40: exports.ctx.yellow,
    30: exports.ctx.green,
    20: exports.ctx.blue,
    10: exports.ctx.grey,
    message: exports.ctx.cyan,
};
function isColouredValue(level) {
    return Number.isInteger(+level) && level in colored;
}
function colorizeLevel(level) {
    if (isColouredValue(level) && Object.prototype.hasOwnProperty.call(constants_1.LEVELS, level)) {
        return colored[level](constants_1.LEVELS[level]);
    }
    return colored.default(constants_1.LEVELS.default);
}
exports.colorizeLevel = colorizeLevel;
//# sourceMappingURL=colors.js.map