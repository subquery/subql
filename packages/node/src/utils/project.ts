import fs from 'fs';
import os from 'os';
import path from 'path';
import tar from 'tar';

export async function processPath(projectPath: string): Promise<string> {
  const stats = fs.statSync(projectPath);
  if (stats.isFile()) {
    const sep = path.basename(projectPath);
    const tmpDir = os.tmpdir();
    const tempPath = fs.mkdtempSync(`${tmpDir}${sep}`);
    // Will promote errors if incorrect format/extension
    await tar.x({ file: projectPath, cwd: tempPath });
    return tempPath.concat('/package');
  } else if (stats.isDirectory()) {
    return projectPath;
  }
}
