import simpleGit, {SimpleGit} from 'simple-git';
const path = require('path');
const git: SimpleGit = simpleGit();

const starterPath = 'https://github.com/jiqiang90/subql-starter';
const localpath = `${process.cwd()}/subql-starter`;

export async function getStarter() {
  try {
    await git.clone(starterPath, localpath);
  } catch (e) {
    /* handle all errors here */
  }
}
