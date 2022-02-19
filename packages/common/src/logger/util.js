"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.levelFilter = void 0;
const constants_1 = require("./constants");
function levelFilter(test, target) {
    return constants_1.LEVELS_MAP[test === null || test === void 0 ? void 0 : test.toLowerCase()] >= constants_1.LEVELS_MAP[target.toLowerCase()];
}
exports.levelFilter = levelFilter;
//# sourceMappingURL=util.js.map