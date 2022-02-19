"use strict";
// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTerraProjectManifest = exports.loadFromJsonOrYaml = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const versioned_1 = require("./versioned");
function loadFromJsonOrYaml(file) {
    const { ext } = path_1.default.parse(file);
    if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json') {
        throw new Error(`Extension ${ext} not supported`);
    }
    const rawContent = fs_1.default.readFileSync(file, 'utf-8');
    return js_yaml_1.default.load(rawContent);
}
exports.loadFromJsonOrYaml = loadFromJsonOrYaml;
function loadFromFile(file) {
    let filePath = file;
    if (fs_1.default.existsSync(file) && fs_1.default.lstatSync(file).isDirectory()) {
        filePath = path_1.default.join(file, 'project.yaml');
    }
    return loadFromJsonOrYaml(filePath);
}
function loadTerraProjectManifest(file) {
    const doc = loadFromFile(file);
    const projectManifest = new versioned_1.ProjectManifestVersioned(doc);
    projectManifest.validate();
    return projectManifest;
}
exports.loadTerraProjectManifest = loadTerraProjectManifest;
//# sourceMappingURL=load.js.map