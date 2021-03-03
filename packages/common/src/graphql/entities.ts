// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  GraphQLSchema,
  GraphQLObjectType,
  isObjectType,
  isNonNullType,
  getNullableType,
  isListType,
  assertListType, getDirectiveValues, GraphQLField
} from 'graphql';
import {DirectiveName} from './constant';

import {
  GraphQLModelsRelations,
  GraphQLModelsType,
  GraphQLEntityField,
  FieldScalar,
  GraphQLRelationsType
} from './types';

export function getAllEntities(schema: GraphQLSchema): GraphQLObjectType[] {
  return Object.entries(schema.getTypeMap())
    .filter(([, node]) => node.astNode?.directives?.find(({name: {value}}) => value === DirectiveName.Entity))
    .map(([, node]) => node)
    .filter(isObjectType);
}

export function getAllEntitiesRelations(schema: GraphQLSchema): GraphQLModelsRelations{
  const modelRelations = {models:[],relations:[]} as GraphQLModelsRelations;
  const entityNameSet = [];
  const reverseLookupRelations = [];

  const derivedFrom = schema.getDirective('derivedFrom');
  const entities = Object.entries(schema.getTypeMap())
      .filter(([, node]) => node.astNode?.directives?.find(({name: {value}}) => value === DirectiveName.Entity))
      .map(([, node]) => node)
      .filter(isObjectType);

  for (const entity of entities){
    entityNameSet.push(entity.name);
  }

  for (const entity of entities){
    const newModel: GraphQLModelsType=  {
      name: entity.name,
      fields : []
    }
    const fields = entity.getFields();
    for (const k in fields){
      if (Object.prototype.hasOwnProperty.call(fields, k)) {
        const typeString = extractType(fields[k].type).toString();
        //If is a basic scalar type
        if (Object.values(FieldScalar).includes(typeString)) {
          newModel.fields.push(packEntityField(typeString, fields[k],'basic'));
        }
        // If is a foreign key
        else if (entityNameSet.includes(typeString) && fields[k].astNode.directives.length ===0){
          newModel.fields.push(packEntityField(typeString, fields[k],'foreignKey'));
          modelRelations.relations.push({
            from:entity.name, //Identity
            type: 'belongsTo',
            to:typeString, //Account
            foreignKey:  `${fields[k].name}Id` //accountId
          } as GraphQLRelationsType)
        }
        // If is derivedFrom
        else if (entityNameSet.includes(typeString) && fields[k].astNode.directives.length!==0){
          const directValues = getDirectiveValues(derivedFrom, fields[k].astNode);
          if (directValues.field){
            reverseLookupRelations.push({
              fromEntity:entity.name,  //Account
              toEntity: typeString,     //Identity
              type: isListType(isNonNullType(fields[k].type) ? getNullableType(fields[k].type) : fields[k].type)? 'hasMany':'hasOne',
              foreignKey: `${directValues.field}Id`, //accountId
              fieldName: fields[k].name, //identity
            })
          }
        }
      }
    }
    modelRelations.models.push(newModel);
  }
  handleDerived(reverseLookupRelations, modelRelations.relations);
  return modelRelations;
}


function packEntityField(typeString:any, field:GraphQLField<any,any>, fieldType?:string) : GraphQLEntityField{
  const entityField: GraphQLEntityField=  {
    name: field.name,
    type: typeString,
    isArray: isListType(isNonNullType(field.type) ? getNullableType(field.type) : field.type),
    nullable: !isNonNullType(field.type),
  }
  if(fieldType === "foreignKey"){
    entityField.name = `${entityField.name}Id`; //Update name
    entityField.type = 'String';
  }
  return entityField
}
//Get the type, ready to be convert to string
function extractType(type:any){
  const offNullType = isNonNullType(type) ?  getNullableType(type) : type ;
  const offListType = isListType(offNullType)?assertListType(offNullType).ofType: type;
  return isNonNullType(offListType)? getNullableType(offListType) : offListType;
}

function handleDerived(reverseLookupRelations,relations:GraphQLRelationsType[]):void{
  for (const r of reverseLookupRelations){
    for (const relation of relations){
      if (r.fromEntity === relation.to
          && r.toEntity === relation.from
          && r.foreignKey === relation.foreignKey){
        relations.push({
          from:r.fromEntity,
          type: r.type,
          to: r.toEntity,
          foreignKey:  r.foreignKey, //accountId
          fieldName: r.fieldName,
        } as GraphQLRelationsType)
      }
    }
  }
}
