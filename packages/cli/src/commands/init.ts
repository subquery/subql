import {Command, flags} from '@oclif/command';
import {getStarter} from '../controller/init-controller';

export default class Init extends Command {
  static description = 'Init a scaffold subquery project';

  static flags = {
    force: flags.boolean({char: 'f'}),
    file: flags.string(),
    starter: flags.boolean(),
  };

  async run(): Promise<void> {
    const {flags} = this.parse(Init);

    if (flags.starter) {
      this.log('Init the starter package');
      await getStarter();
    }
  }
}
