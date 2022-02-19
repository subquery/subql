"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubReader = void 0;
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const js_yaml_1 = __importDefault(require("js-yaml"));
class GithubReader {
    constructor(key) {
        this.key = key;
        this.api = axios_1.default.create({
            baseURL: `https://raw.githubusercontent.com/${key}`,
        });
    }
    get root() {
        return undefined;
    }
    async getPkg() {
        return this.getFile('package.json');
    }
    async getProjectSchema() {
        const projectYaml = await this.getFile('project.yaml');
        if (projectYaml === undefined) {
            throw new Error('Fetch project from github got undefined');
        }
        return js_yaml_1.default.load(projectYaml);
    }
    async getFile(fileName) {
        try {
            const branch = await this.getDefaultBranch();
            const { data } = await this.api.get(path_1.default.join(branch, fileName));
            return data;
        }
        catch (err) {
            return undefined;
        }
    }
    async getDefaultBranch() {
        if (this.defaultBranch) {
            return this.defaultBranch;
        }
        const { data } = await axios_1.default.get(`https://api.github.com/repos/${this.key}`);
        this.defaultBranch = data.default_branch;
        return this.defaultBranch;
    }
}
exports.GithubReader = GithubReader;
//# sourceMappingURL=github-reader.js.map