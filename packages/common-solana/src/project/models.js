"use strict";
// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerraCustomDataSourceBase = exports.TerraFileReferenceImpl = exports.TerraRuntimeDataSourceBase = exports.TerraCustomMapping = exports.TerraMapping = exports.TerraCustomHandler = exports.TerraEventHandler = exports.TerraBlockHandler = exports.TerraEventFilter = void 0;
const types_terra_1 = require("../../../types-terra/src");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class TerraEventFilter {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TerraEventFilter.prototype, "type", void 0);
exports.TerraEventFilter = TerraEventFilter;
class TerraBlockHandler {
}
__decorate([
    (0, class_validator_1.IsEnum)(types_terra_1.SubqlTerraHandlerKind, { groups: [types_terra_1.SubqlTerraHandlerKind.Block] }),
    __metadata("design:type", String)
], TerraBlockHandler.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TerraBlockHandler.prototype, "handler", void 0);
exports.TerraBlockHandler = TerraBlockHandler;
class TerraEventHandler {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TerraEventFilter),
    __metadata("design:type", Object)
], TerraEventHandler.prototype, "filter", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(types_terra_1.SubqlTerraHandlerKind, { groups: [types_terra_1.SubqlTerraHandlerKind.Event] }),
    __metadata("design:type", String)
], TerraEventHandler.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TerraEventHandler.prototype, "handler", void 0);
exports.TerraEventHandler = TerraEventHandler;
class TerraCustomHandler {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TerraCustomHandler.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TerraCustomHandler.prototype, "handler", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], TerraCustomHandler.prototype, "filter", void 0);
exports.TerraCustomHandler = TerraCustomHandler;
class TerraMapping {
}
__decorate([
    (0, class_transformer_1.Transform)((params) => {
        const handlers = params.value;
        return handlers.map((handler) => {
            switch (handler.kind) {
                case types_terra_1.SubqlTerraHandlerKind.Event:
                    return (0, class_transformer_1.plainToClass)(TerraEventHandler, handler);
                case types_terra_1.SubqlTerraHandlerKind.Block:
                    return (0, class_transformer_1.plainToClass)(TerraBlockHandler, handler);
                default:
                    throw new Error(`handler ${handler.kind} not supported`);
            }
        });
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)(),
    __metadata("design:type", Array)
], TerraMapping.prototype, "handlers", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TerraMapping.prototype, "file", void 0);
exports.TerraMapping = TerraMapping;
class TerraCustomMapping {
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_transformer_1.Type)(() => TerraCustomHandler),
    (0, class_validator_1.ValidateNested)(),
    __metadata("design:type", Array)
], TerraCustomMapping.prototype, "handlers", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TerraCustomMapping.prototype, "file", void 0);
exports.TerraCustomMapping = TerraCustomMapping;
class TerraRuntimeDataSourceBase {
}
__decorate([
    (0, class_validator_1.IsEnum)(types_terra_1.SubqlTerraDatasourceKind, { groups: [types_terra_1.SubqlTerraDatasourceKind.Runtime] }),
    __metadata("design:type", String)
], TerraRuntimeDataSourceBase.prototype, "kind", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => TerraMapping),
    (0, class_validator_1.ValidateNested)(),
    __metadata("design:type", Object)
], TerraRuntimeDataSourceBase.prototype, "mapping", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], TerraRuntimeDataSourceBase.prototype, "startBlock", void 0);
exports.TerraRuntimeDataSourceBase = TerraRuntimeDataSourceBase;
class TerraFileReferenceImpl {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TerraFileReferenceImpl.prototype, "file", void 0);
exports.TerraFileReferenceImpl = TerraFileReferenceImpl;
class TerraCustomDataSourceBase {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TerraCustomDataSourceBase.prototype, "kind", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => TerraCustomMapping),
    (0, class_validator_1.ValidateNested)(),
    __metadata("design:type", Object)
], TerraCustomDataSourceBase.prototype, "mapping", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], TerraCustomDataSourceBase.prototype, "startBlock", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => TerraFileReferenceImpl),
    (0, class_validator_1.ValidateNested)({ each: true }),
    __metadata("design:type", Map)
], TerraCustomDataSourceBase.prototype, "assets", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => TerraFileReferenceImpl),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], TerraCustomDataSourceBase.prototype, "processor", void 0);
exports.TerraCustomDataSourceBase = TerraCustomDataSourceBase;
//# sourceMappingURL=models.js.map