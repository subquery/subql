// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Command, Flags} from '@oclif/core';
import * as inquirer from 'inquirer';
import Delete from './delete';
import Deploy from './deploy';
import Promote from './promote';

type DeploymentOption = 'promote' | 'delete' | 'deploy';

export default class Deployment extends Command {
  static description = 'Deployment to hosted service';
  static flags = {
    options: Flags.string({
      options: ['deploy', 'promote', 'delete'],
    }),
    ...Deploy.flags,
    ...Promote.flags,
    ...Delete.flags,
  };
  static optionMapping = {
    deploy: Deploy,
    promote: Promote,
    delete: Delete,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Deployment);
    const option = flags.options;
    let stripped_argv: string[];
    let userOptions: DeploymentOption;

    // const authToken = await checkToken(process.env.SUBQL_ACCESS_TOKEN, ACCESS_TOKEN_PATH);
    if (!option) {
      const response = await inquirer.prompt([
        {
          name: 'deploymentOptions',
          message: 'Select an deployment option',
          type: 'list',
          choices: [{name: 'deploy'}, {name: 'promote'}, {name: 'delete'}],
        },
      ]);

      userOptions = response.deploymentOptions;
    } else {
      userOptions = option as DeploymentOption;
    }
    this.log(`Selected deployment option: ${userOptions}`);
    try {
      const handler = Deployment.optionMapping[userOptions];
      stripped_argv = process.argv.filter(
        (v, idx) => v !== 'deployment' && idx > process.argv.indexOf('deployment') && !v.includes('--options')
      );
      const output_arr: string[] = [];
      stripped_argv.map((v: string) => v.split('=').map((x: string) => output_arr.push(x)));

      // this.log(`process.argv: ${JSON.stringify(process.argv,null, 2)}`);
      this.log(`stripped_argv: ${JSON.stringify(stripped_argv, null, 2)}`);
      // this.log(`string_arr: ${JSON.stringify(stringArr,null, 2)}`);
      this.log(`output_arr: ${JSON.stringify(output_arr, null, 2)}`);
      // this.log(`mapped_arr: ${JSON.stringify(mapped,null, 2)}`);
      const command_res = await handler.run([]);
      this.log(`${command_res}`);
    } catch (e) {
      this.log(`Failed to execute command: ${userOptions} error: ${e}`);
    }

    // }  else {
    //   org = await cli.prompt('Enter organization name');
    //   project_name = await cli.prompt('Enter project name');
    //   ipfsCID = await cli.prompt('Enter IPFS CID');
    //   const validator = await ipfsCID_validate(ipfsCID, authToken);

    // if (!validator) {
    //   throw new Error(chalk.bgRedBright('Invalid IPFS CID'));
    // }

    // const indexer_res = await inquirer.prompt({
    //   name: 'indexer_version',
    //   message: 'Enter indexer version',
    //   type: 'list',
    //   choices: await getImage_v(validator.runner.node.name, validator.runner.node.version, authToken),
    // });
    // indexer_v = indexer_res.indexer_version;

    // const query_res = await inquirer.prompt({
    //   name: 'query_version',
    //   message: 'Enter indexer version',
    //   type: 'list',
    //   choices: await getImage_v(validator.runner.query.name, validator.runner.query.version, authToken),
    // });
    // query_v = query_res.query_version;

    // endpoint = await cli.prompt('Enter endpoint', {default: await getEndpoint(validator.chainId), required: false});
    // dictEndpoint = await cli.prompt('Enter dictionary', {
    //   default: await getDictEndpoint(validator.chainId),
    //   required: false,
    // });

    // type = await cli.prompt('Enter type', {default: DEFAULT_DEPLOYMENT_TYPE, required: false});

    // const handler = new Deployment.optionMapping[userOptions];
    // const deployment_output = await handler([
    //   '--org', org,
    //   '--project_name', project_name,
    //   '--ipfsCID', ipfsCID,
    //   '--indexer_v', indexer_v,
    //   '--query_v', query_v,
    //   '--endpoint', endpoint,
    //   '--type', type,
    //   '--dictEndpoint', dictEndpoint,
    // ]);
    // this.log(`Project: ${deployment_output.projectKey}
    // \nStatus: ${chalk.blue(deployment_output.status)}
    // \nDeploymentID: ${deployment_output.id}
    // \nDeployment Type: ${deployment_output.type}
    // \nEndpoint: ${deployment_output.endpoint}
    // \nDictionary Endpoint: ${deployment_output.dictEndpoint}
    // `);

    // }
  }
  // }
}
