import {Command, flags} from '@oclif/command';

import {createProject} from '../controller/init-controller';

export default class Init extends Command {
  static description = 'Init a scaffold subquery project';

  static flags = {
    force: flags.boolean({char: 'f'}),
    starter: flags.boolean(),
  };

  static args = [
    {
      name: 'projectName',
      required: true,
      description: 'Give the starter project name',
    },
  ];

  async run(): Promise<void> {
    const {flags, args} = this.parse(Init);
    if (flags.starter && args.projectName) {
      this.log('Init the starter package');
      await createProject(args.projectName);
      this.log(`Starter package: ${args.projectName} is ready`);
    }
  }
}
