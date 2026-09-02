import fs from 'node:fs';

const requiredFiles = ['dist/index.js', 'dist/HomeKitDevice.js', 'dist/HomeKitHistory.js'];
const missingFiles = requiredFiles.filter((file) => fs.existsSync(file) === false);

if (missingFiles.length !== 0) {
  throw new Error(
    'Build is incomplete; missing ' +
      missingFiles.join(', ') +
      '. Initialize the HomeKitDevice and HomeKitHistory Git submodules before building.',
  );
}
