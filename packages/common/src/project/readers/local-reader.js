"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalReader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
class LocalReader {
    constructor(projectPath) {
        this.projectPath = projectPath;
    }
    get root() {
        return this.projectPath;
    }
    async getPkg() {
        return js_yaml_1.default.load(await this.getFile('package.json'));
    }
    async getProjectSchema() {
        return js_yaml_1.default.load(await this.getFile('project.yaml'));
    }
    async getFile(fileName) {
        const file = path.join(this.projectPath, fileName);
        if (!fs.existsSync(file)) {
            return Promise.resolve(undefined);
        }
        try {
            return fs.readFileSync(file, 'utf-8');
        }
        catch (e) {
            return undefined;
        }
    }
}
exports.LocalReader = LocalReader;
//# sourceMappingURL=local-reader.js.map