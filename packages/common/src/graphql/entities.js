"use strict";
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setJsonObjectType = exports.getAllEntitiesRelations = exports.getAllEnums = exports.getAllJsonObjects = void 0;
const assert_1 = __importDefault(require("assert"));
const common_1 = require("..");
const graphql_1 = require("graphql");
const constant_1 = require("./constant");
const schema_1 = require("./schema");
const types_1 = require("./types");
function getAllJsonObjects(_schema) {
    return Object.values(getSchema(_schema).getTypeMap())
        .filter((node) => { var _a, _b; return (_b = (_a = node.astNode) === null || _a === void 0 ? void 0 : _a.directives) === null || _b === void 0 ? void 0 : _b.find(({ name: { value } }) => value === constant_1.DirectiveName.JsonField); })
        .map((node) => node)
        .filter(graphql_1.isObjectType);
}
exports.getAllJsonObjects = getAllJsonObjects;
function getAllEnums(_schema) {
    return getEnumsFromSchema(getSchema(_schema));
}
exports.getAllEnums = getAllEnums;
// eslint-disable-next-line complexity
function getAllEntitiesRelations(_schema) {
    const schema = getSchema(_schema);
    const entities = Object.values(schema.getTypeMap())
        .filter((node) => { var _a, _b; return (_b = (_a = node.astNode) === null || _a === void 0 ? void 0 : _a.directives) === null || _b === void 0 ? void 0 : _b.find(({ name: { value } }) => value === constant_1.DirectiveName.Entity); })
        .filter(graphql_1.isObjectType);
    const jsonObjects = getAllJsonObjects(schema);
    const entityNameSet = entities.map((entity) => entity.name);
    const enums = new Map(getEnumsFromSchema(schema).map((node) => [
        node.name,
        { name: node.name, description: node.description, values: node.getValues().map((v) => v.value) },
    ]));
    const modelRelations = { models: [], relations: [], enums: [...enums.values()] };
    const derivedFrom = schema.getDirective('derivedFrom');
    const indexDirective = schema.getDirective('index');
    for (const entity of entities) {
        const newModel = {
            name: entity.name,
            description: entity.description,
            fields: [],
            indexes: [],
        };
        for (const field of Object.values(entity.getFields())) {
            const typeString = extractType(field.type);
            const derivedFromDirectValues = (0, graphql_1.getDirectiveValues)(derivedFrom, field.astNode);
            const indexDirectiveVal = (0, graphql_1.getDirectiveValues)(indexDirective, field.astNode);
            //If is a basic scalar type
            const typeClass = (0, common_1.getTypeByScalarName)(typeString);
            if (typeClass === null || typeClass === void 0 ? void 0 : typeClass.fieldScalar) {
                newModel.fields.push(packEntityField(typeString, field, false));
            }
            // If is an enum
            else if (enums.has(typeString)) {
                newModel.fields.push({
                    type: typeString,
                    description: field.description,
                    isEnum: true,
                    isArray: (0, graphql_1.isListType)((0, graphql_1.isNonNullType)(field.type) ? (0, graphql_1.getNullableType)(field.type) : field.type),
                    nullable: !(0, graphql_1.isNonNullType)(field.type),
                    name: field.name,
                });
            }
            // If is a foreign key
            else if (entityNameSet.includes(typeString) && !derivedFromDirectValues) {
                newModel.fields.push(packEntityField(typeString, field, true));
                modelRelations.relations.push({
                    from: entity.name,
                    type: 'belongsTo',
                    to: typeString,
                    foreignKey: `${field.name}Id`,
                });
                newModel.indexes.push({
                    unique: false,
                    fields: [`${field.name}Id`],
                    using: types_1.IndexType.HASH,
                });
            }
            // If is derivedFrom
            else if (entityNameSet.includes(typeString) && derivedFromDirectValues) {
                modelRelations.relations.push({
                    from: entity.name,
                    type: (0, graphql_1.isListType)((0, graphql_1.isNonNullType)(field.type) ? (0, graphql_1.getNullableType)(field.type) : field.type) ? 'hasMany' : 'hasOne',
                    to: typeString,
                    foreignKey: `${derivedFromDirectValues.field}Id`,
                    fieldName: field.name,
                });
            }
            // If is jsonField
            else if (jsonObjects.map((json) => json.name).includes(typeString)) {
                const jsonObject = setJsonObjectType(jsonObjects.find((object) => object.name === typeString), jsonObjects);
                newModel.fields.push(packJSONField(typeString, field, jsonObject));
                newModel.indexes.push({
                    unique: false,
                    fields: [field.name],
                    using: types_1.IndexType.GIN,
                });
            }
            else {
                throw new Error(`${typeString} is not an valid type`);
            }
            // handle indexes
            if (indexDirectiveVal) {
                if (typeString !== 'ID' && typeClass) {
                    newModel.indexes.push({
                        unique: indexDirectiveVal.unique,
                        fields: [field.name],
                    });
                }
                else if (typeString !== 'ID' && entityNameSet.includes(typeString)) {
                    if (indexDirectiveVal.unique) {
                        const fkIndex = newModel.indexes.find((idx) => idx.fields.length === 1 && idx.fields[0] === `${field.name}Id`);
                        if (fkIndex) {
                            fkIndex.unique = true;
                        }
                    }
                }
                else {
                    throw new Error(`index can not be added on field ${field.name}`);
                }
            }
        }
        modelRelations.models.push(newModel);
    }
    validateRelations(modelRelations);
    return modelRelations;
}
exports.getAllEntitiesRelations = getAllEntitiesRelations;
function packEntityField(typeString, field, isForeignKey) {
    return {
        name: isForeignKey ? `${field.name}Id` : field.name,
        type: isForeignKey ? types_1.FieldScalar.String : typeString,
        description: field.description,
        isArray: (0, graphql_1.isListType)((0, graphql_1.isNonNullType)(field.type) ? (0, graphql_1.getNullableType)(field.type) : field.type),
        nullable: !(0, graphql_1.isNonNullType)(field.type),
        isEnum: false,
    };
}
function packJSONField(typeString, field, jsonObject) {
    return {
        name: field.name,
        type: 'Json',
        description: field.description,
        jsonInterface: jsonObject,
        isArray: (0, graphql_1.isListType)((0, graphql_1.isNonNullType)(field.type) ? (0, graphql_1.getNullableType)(field.type) : field.type),
        nullable: !(0, graphql_1.isNonNullType)(field.type),
        isEnum: false,
    };
}
function setJsonObjectType(jsonObject, jsonObjects) {
    const graphQLJsonObject = {
        name: jsonObject.name,
        fields: [],
    };
    for (const field of Object.values(jsonObject.getFields())) {
        //check if field is also json
        const typeString = extractType(field.type);
        const isJsonType = jsonObjects.map((json) => json.name).includes(typeString);
        graphQLJsonObject.fields.push({
            name: field.name,
            type: isJsonType ? 'Json' : extractType(field.type),
            jsonInterface: isJsonType
                ? setJsonObjectType(jsonObjects.find((object) => object.name === typeString), jsonObjects)
                : undefined,
            nullable: !(0, graphql_1.isNonNullType)(field.type),
            isArray: (0, graphql_1.isListType)((0, graphql_1.isNonNullType)(field.type) ? (0, graphql_1.getNullableType)(field.type) : field.type),
        });
    }
    return graphQLJsonObject;
}
exports.setJsonObjectType = setJsonObjectType;
function getSchema(_schema) {
    return typeof _schema === 'string' ? (0, schema_1.buildSchemaFromFile)(_schema) : _schema;
}
function getEnumsFromSchema(schema) {
    return Object.values(schema.getTypeMap())
        .filter((r) => r.astNode !== undefined)
        .filter(graphql_1.isEnumType);
}
//Get the type, ready to be convert to string
function extractType(type) {
    if ((0, graphql_1.isUnionType)(type)) {
        throw new Error(`Not support Union type`);
    }
    if ((0, graphql_1.isInterfaceType)(type)) {
        throw new Error(`Not support Interface type`);
    }
    const offNullType = (0, graphql_1.isNonNullType)(type) ? (0, graphql_1.getNullableType)(type) : type;
    const offListType = (0, graphql_1.isListType)(offNullType) ? (0, graphql_1.assertListType)(offNullType).ofType : type;
    return (0, graphql_1.isNonNullType)(offListType)
        ? (0, graphql_1.getNullableType)(offListType).name
        : offListType.name;
}
function validateRelations(modelRelations) {
    for (const r of modelRelations.relations.filter((model) => model.type === 'hasMany' || model.type === 'hasOne')) {
        (0, assert_1.default)(modelRelations.models.find((model) => model.name === r.to && model.fields.find((field) => field.name === r.foreignKey)), `Please check entity ${r.from} with field ${r.fieldName} has correct relation with entity ${r.to}`);
    }
}
//# sourceMappingURL=entities.js.map