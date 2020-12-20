import fs from 'fs';
import path from 'path';
import {isNonNullType, getNullableType} from 'graphql';
import ejs from 'ejs';
import {getAllEntities, buildSchema} from '@subql/common';
import {GraphQLFieldMap, GraphQLOutputType} from 'graphql/type/definition';
import {transformTypes} from './types-mapping';
const templatePath: string = path.resolve(__dirname, '../template/model.ts.ejs');
const typesPath = `${process.cwd()}/src/types/models`;

// 4. Save the rendered schema
function makeSchema(className: string, data: string): void {
  const filename = `${className}.ts`;
  const file = `${typesPath}/${filename}`;

  fs.writeFile(file, data, function () {
    console.log(`>--- Schema ${className} generated !`);
  });
}

// 3. Render entity data in ejs template
export function renderTemplate(className: string, modelTemplate: ejs.Data): void {
  ejs.renderFile(templatePath, modelTemplate, function (err, str) {
    if (err) {
      console.log(`!!! When render entity ${className} to schema have following problems !!! `);
      console.log(err);
    } else {
      makeSchema(className, str);
    }
  });
}

// 2. Re-format the field of the entity
export interface processedField {
  name: string;
  type: string;
  required: boolean;
}

export function processFields(className: string, fields: GraphQLFieldMap<any, any>): processedField[] {
  const fieldList: processedField[] = [];
  for (const k in fields) {
    if (Object.prototype.hasOwnProperty.call(fields, k)) {
      const type: GraphQLOutputType = isNonNullType(fields[k].type) ? getNullableType(fields[k].type) : fields[k].type;
      const newType = transformTypes(className, type.toString());
      fieldList.push({
        name: fields[k].name,
        type: newType,
        required: isNonNullType(fields[k].type),
      });
    }
  }
  return fieldList;
}

// 1. Loop all entities and render it
export function generateSchema(): void {
  const schema = buildSchema('./schema.graphql');
  const extractEntities = getAllEntities(schema);

  for (const entity of extractEntities) {
    const baseFolderPath = '.../../base';
    const className = entity.name;
    const fields = entity.getFields();
    const processedFields: processedField[] = processFields(className, fields);
    const modelTemplate = {
      props: {
        baseFolderPath: baseFolderPath,
        className: className,
        fields: processedFields,
      },
    };
    console.log(`<--- Start generate schema ${modelTemplate.props.className}`);
    renderTemplate(className, modelTemplate);
  }
}
