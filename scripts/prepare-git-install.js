import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dependencies = [
  {
    directory: 'src/HomeKitDevice',
    entry: 'HomeKitDevice.js',
    repository: 'https://github.com/n0rt0nthec4t/HomeKitDevice.git',
    revision: '83c051028237bc5d490f2c8cd56e7ba1b9642586',
  },
  {
    directory: 'src/fetchWrapper',
    entry: 'fetchWrapper.js',
    repository: 'https://github.com/n0rt0nthec4t/fetchWrapper.git',
    revision: '3cd6aa6690ffde53c07342482e7637a9d2031a03',
  },
  {
    directory: 'src/HomeKitHistory',
    entry: 'HomeKitHistory.js',
    repository: 'https://github.com/n0rt0nthec4t/HomeKitHistory.git',
    revision: 'fb5546513f5d487439485d902d42cc2706358511',
  },
];

for (const dependency of dependencies) {
  if (fs.existsSync(path.join(dependency.directory, dependency.entry)) === true) {
    continue;
  }

  // npm removes the parent repository's .git directory before running a Git
  // dependency's prepare script, so `git submodule update` cannot be used here.
  // Clone each missing submodule directly and pin it to the gitlink revision.
  fs.rmSync(dependency.directory, { force: true, recursive: true });

  try {
    execFileSync('git', ['clone', '--quiet', dependency.repository, dependency.directory], { stdio: 'inherit' });
    execFileSync('git', ['-C', dependency.directory, 'checkout', '--quiet', dependency.revision], { stdio: 'inherit' });
  } catch (error) {
    fs.rmSync(dependency.directory, { force: true, recursive: true });
    throw new Error('Unable to obtain build dependency ' + dependency.repository, { cause: error });
  }
}
