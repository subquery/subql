"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeClass = void 0;
const assert_1 = __importDefault(require("assert"));
class TypeClass {
    constructor(name, _hashCode, _tsType, _fieldScalar, _sequelizeType) {
        this.name = name;
        this._hashCode = _hashCode;
        this._tsType = _tsType;
        this._fieldScalar = _fieldScalar;
        this._sequelizeType = _sequelizeType;
    }
    get tsType() {
        return this._tsType;
    }
    get fieldScalar() {
        return this._fieldScalar;
    }
    get sequelizeType() {
        (0, assert_1.default)(this._sequelizeType !== undefined, `Type ${this.name} associated sequelize type is not supported`);
        return this._sequelizeType;
    }
    hashCode(data) {
        if (this._hashCode === undefined) {
            return Buffer.from(JSON.stringify(data));
        }
        return this._hashCode(data);
    }
}
exports.TypeClass = TypeClass;
//# sourceMappingURL=TypeClass.js.map