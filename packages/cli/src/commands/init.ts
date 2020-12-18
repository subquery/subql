import {Command, flags} from '@oclif/command';

import {getStarter} from '../controller/init-controller';

export default class Init extends Command {
  static description = 'Init a scafflod subquery project';

  static flags = {
    force: flags.boolean({char: 'f'}),
    file: flags.string(),
    starter: flags.string(),
  };

  async run(): Promise<void> {
    const {flags} = this.parse(Init);
    if (flags.starter) {
      this.log('Init the starter package');
      await getStarter(flags.starter);
      this.log(`Starter package: ${flags.starter} is ready`);
    }
  }
}
