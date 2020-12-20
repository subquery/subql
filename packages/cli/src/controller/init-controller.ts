import fs from 'fs';
import simpleGit, {SimpleGit} from 'simple-git';
const git: SimpleGit = simpleGit();

const starterPath = 'https://github.com/jiqiang90/subql-starter';

export async function createProject(projectName: string): Promise<void> {
  const localPath = `${process.cwd()}/${projectName}`;
  try {
    await git.clone(starterPath, localPath);
    const packageData = fs.readFileSync(`${localPath}/package.json`);
    const currentPackage = JSON.parse(packageData.toString());
    currentPackage.name = projectName;
    const newPackage = JSON.stringify(currentPackage, null, 2);
    fs.writeFileSync(`${localPath}/package.json`, newPackage, 'utf8');
  } catch (e) {
    /* handle all errors here */
    console.log(e);
  }
}
