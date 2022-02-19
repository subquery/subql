"use strict";
// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectManifestVersioned = exports.manifestIsV0_3_0 = void 0;
const types_terra_1 = require("../../../../types-terra/src");
const class_transformer_1 = require("class-transformer");
const v0_3_0_1 = require("./v0_3_0");
const SUPPORTED_VERSIONS = {
    '0.3.0': v0_3_0_1.ProjectManifestV0_3_0Impl,
};
function manifestIsV0_3_0(manifest) {
    return manifest.specVersion === '0.3.0';
}
exports.manifestIsV0_3_0 = manifestIsV0_3_0;
class ProjectManifestVersioned {
    constructor(projectManifest) {
        const klass = SUPPORTED_VERSIONS[projectManifest.specVersion];
        if (!klass) {
            throw new Error('specVersion not supported for project manifest file');
        }
        this._impl = (0, class_transformer_1.plainToClass)(klass, projectManifest);
    }
    get asImpl() {
        return this._impl;
    }
    get isV0_3_0() {
        return this.specVersion === '0.3.0';
    }
    get asV0_3_0() {
        return this._impl;
    }
    toDeployment() {
        return this.toDeployment();
    }
    validate() {
        this._impl.validate();
    }
    get dataSources() {
        return this._impl.dataSources;
    }
    get schema() {
        return this._impl.schema.file;
    }
    get specVersion() {
        return this._impl.specVersion;
    }
    get description() {
        return this._impl.description;
    }
    get repository() {
        return this._impl.repository;
    }
}
exports.ProjectManifestVersioned = ProjectManifestVersioned;
//# sourceMappingURL=ProjectManifestVersioned.js.map