import * as child from 'child_process';
import {Command, flags} from '@oclif/command';

export default class Build extends Command {
  static description = 'Pack this SubQuery project';

  static flags = {
    force: flags.boolean({char: 'f'}),
    file: flags.string(),
  };

  async run(): Promise<void> {
    // run npm pack
    this.log('Packing your SubQuery Project ...');
    await new Promise((resolve, reject) => {
      child.exec(`rm -rf dist && tsc -b && npm pack`, (error: child.ExecException, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
          this.log(stderr);
        } else {
          resolve(stdout);
          this.log('Finished packing!');
        }
      });
    });
  }
}
