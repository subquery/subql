"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPFSReader = void 0;
const util_1 = require("@polkadot/util");
const ipfs_http_client_1 = __importDefault(require("ipfs-http-client"));
const js_yaml_1 = __importDefault(require("js-yaml"));
class IPFSReader {
    constructor(cid, gateway) {
        this.cid = cid;
        if (!gateway) {
            throw new Error('IPFS Gateway not provided');
        }
        this.ipfs = ipfs_http_client_1.default.create({ url: gateway });
    }
    get root() {
        return undefined;
    }
    async getPkg() {
        return Promise.resolve(undefined);
    }
    async getProjectSchema() {
        const projectYaml = await this.getFile(this.cid);
        if (projectYaml === undefined) {
            throw new Error(`Fetch project from ipfs ${this.cid} got undefined`);
        }
        return js_yaml_1.default.load(projectYaml);
    }
    async getFile(fileName) {
        var e_1, _a;
        try {
            const resolvedFileName = fileName.replace('ipfs://', '');
            const req = this.ipfs.cat(resolvedFileName);
            const scriptBufferArray = [];
            try {
                for (var req_1 = __asyncValues(req), req_1_1; req_1_1 = await req_1.next(), !req_1_1.done;) {
                    const res = req_1_1.value;
                    scriptBufferArray.push(res);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (req_1_1 && !req_1_1.done && (_a = req_1.return)) await _a.call(req_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return Buffer.from((0, util_1.u8aConcat)(...scriptBufferArray)).toString('utf8');
        }
        catch (e) {
            console.error(`Reader get file failed`, e);
            return undefined;
        }
    }
}
exports.IPFSReader = IPFSReader;
//# sourceMappingURL=ipfs-reader.js.map