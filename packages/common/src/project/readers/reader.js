"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReaderFactory = void 0;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const tar_1 = __importDefault(require("tar"));
const github_reader_1 = require("./github-reader");
const ipfs_reader_1 = require("./ipfs-reader");
const local_reader_1 = require("./local-reader");
const CIDv0 = new RegExp(/Qm[1-9A-Za-z]{44}[^OIl]/i);
const CIDv1 = new RegExp(/Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/i);
async function extractFromArchive(projectPath) {
    const sep = path_1.default.sep;
    const tmpDir = os_1.default.tmpdir();
    const tempPath = fs_1.default.mkdtempSync(`${tmpDir}${sep}`);
    // Will promote errors if incorrect format/extension
    await tar_1.default.x({ file: projectPath, cwd: tempPath });
    return tempPath.concat('/package');
}
class ReaderFactory {
    static async create(location, options) {
        // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
        const githubMatch = location.match(/https:\/\/github.com\/([\w-_]+\/[\w-_]+)/i);
        if (githubMatch) {
            return new github_reader_1.GithubReader(githubMatch[1]);
        }
        const locationWithoutSchema = location.replace('ipfs://', '');
        if (CIDv0.test(locationWithoutSchema) || CIDv1.test(locationWithoutSchema)) {
            return new ipfs_reader_1.IPFSReader(locationWithoutSchema, options.ipfs);
        }
        const stats = fs_1.default.statSync(location);
        if (stats.isDirectory()) {
            return new local_reader_1.LocalReader(location);
        }
        if (stats.isFile()) {
            const projectPath = await extractFromArchive(location);
            return new local_reader_1.LocalReader(projectPath);
        }
        throw new Error(`unknown location: ${location}`);
    }
}
exports.ReaderFactory = ReaderFactory;
//# sourceMappingURL=reader.js.map