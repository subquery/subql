import {Command, flags} from '@oclif/command';

import {getStarter} from '../controller/init-controller';

export default class Init extends Command {
  static description = 'Welcome, Init a subquery project';

  static flags = {
    force: flags.boolean({char: 'f'}),
    file: flags.string(),
    starter: flags.boolean(),
  };

  async run() {
    const {flags} = this.parse(Init);

    if (flags.starter) {
      console.log('Init the starter package');
      getStarter();
    }
  }
}
