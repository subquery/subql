// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// return a list of all generated ABIs
import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import {upperFirst} from 'lodash';
import {generateAbis} from './codegen-controller';

const SCAFFOLD_HANDLER_TEMPLATE_PATH = path.resolve(__dirname, '../template/handler-scaffold.ts.ejs');
const ABI_INTERFACES_ROOT_DIR = 'src/types/abi-interfaces';
const ROOT_MAPPING_DIR = 'src/mappings';

export async function renderTemplate(templatePath: string, outputPath: string, templateData: ejs.Data): Promise<void> {
  const data = await ejs.renderFile(templatePath, templateData);
  await fs.promises.writeFile(outputPath, data);
}
// after selecting a type, this should generate a handler in accordance

export interface handlerPropType {
  name: string;
  arg: string;
  argType: string;
}
export async function generateScaffold(handlerProps: handlerPropType[], projectPath: string): Promise<void> {
  try {
    await renderTemplate(
      SCAFFOLD_HANDLER_TEMPLATE_PATH,
      path.join(projectPath, ROOT_MAPPING_DIR, 'mappingHandlers.ts'),
      {
        props: {
          handlers: handlerProps,
        },
        // helper: {},
      }
    );
  } catch (e) {
    console.error(`unable to generate scaffold. ${e.message}`);
  }

  await fs.promises.writeFile(path.join(projectPath, 'src/index.ts'), 'export * from "./mappings/mappingHandlers"');
}

// template out the handler
