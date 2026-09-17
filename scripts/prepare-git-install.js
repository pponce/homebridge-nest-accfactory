import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dependencies = [
  {
    directory: 'src/HomeKitDevice',
    entry: 'HomeKitDevice.js',
    repository: 'https://github.com/n0rt0nthec4t/HomeKitDevice.git',
    revision: '7149a96b4aa4a82804c97d93354a4e384d7c40a7',
  },
  {
    directory: 'src/fetchWrapper',
    entry: 'fetchWrapper.js',
    repository: 'https://github.com/n0rt0nthec4t/fetchWrapper.git',
    revision: '07442477e4d5a63ed899402fee4bf5f79abb45e7',
  },
  {
    directory: 'src/HomeKitHistory',
    entry: 'HomeKitHistory.js',
    repository: 'https://github.com/n0rt0nthec4t/HomeKitHistory.git',
    revision: 'ea57d694aa0dafc64758926f483b317ab374615f',
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
