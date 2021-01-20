import {DynamicModule, Global, Module} from '@nestjs/common';
import yargs from 'yargs/yargs';
import {hideBin} from 'yargs/helpers';
import {Config} from './config';

@Global()
@Module({})
export class ConfigureModule {
  static register(): DynamicModule {
    const opts = yargs(hideBin(process.argv)).options({
      schema: {
        alias: 's',
        describe: 'database schema to query',
        type: 'string',
        demandOption: false,
      },
      playground: {
        describe: 'enable graphql playground',
        type: 'boolean',
        demandOption: false,
      },
    }).argv;

    const config = new Config({
      dbSchema: opts.schema,
      playground: opts.playground,
    });

    return {
      module: ConfigureModule,
      providers: [
        {
          provide: Config,
          useValue: config,
        },
      ],
      exports: [Config],
    };
  }
}
