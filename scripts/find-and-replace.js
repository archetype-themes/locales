// Utility script to compare locale files for matching values and update liquid files with new locale keys
// Useful for updating your theme project to use locale keys from this project.
// 
// node ./scripts/find-and-replace.js fileA fileB directoryPattern ignorePattern
// 
// Example:
// node ./scripts/find-and-replace.js ./locales/en.default.json ../expanse/locales/en.default.json ../expanse/**/*.liquid ../expanse/snippets/*.liquid


const fs = require('fs');
const path = require('path');
const glob = require('glob');

function readJsonFile(filePath) {
    const rawData = fs.readFileSync(filePath);
    return JSON.parse(rawData);
}

function findAllKeyPaths(obj, targetValue, currentPath = '', paths = []) {
  for (let key in obj) {
      const value = obj[key];
      const newPath = currentPath ? `${currentPath}.${key}` : key;

      if (typeof value === 'object' && value !== null) {
          findAllKeyPaths(value, targetValue, newPath, paths);
      } else if (typeof value === 'string' && value.toLowerCase() === targetValue.toLowerCase()) {
          paths.push(newPath);
      }
  }
  return paths;
}

function replaceInFiles(directoryPattern, ignorePattern, mappings) {
  const options = { ignore: ignorePattern };
  const files = glob.sync(directoryPattern, options);

  files.forEach(file => {
      let content = fs.readFileSync(file, 'utf8');
      let replaced = false;

      for (let keyB in mappings) {
          mappings[keyB].forEach(keyA => {
              const regex = new RegExp(`'${keyB}'`, 'g');
              if (regex.test(content)) {
                  content = content.replace(regex, `'${keyA}'`);
                  replaced = true;
              }
          });
      }

      if (replaced) {
          fs.writeFileSync(file, content);
      }
  });
}

const [fileA, fileB, directoryPattern, ignorePattern] = process.argv.slice(2);

const keyMappings = {};
for (let keyA in fileA) {
    const valueA = fileA[keyA];
    const keyBs = findAllKeyPaths(fileB, valueA);

    keyBs.forEach(keyB => {
        if (!keyMappings[keyB]) {
            keyMappings[keyB] = [];
        }
        keyMappings[keyB].push(keyA);
    });
}

replaceInFiles(directoryPattern, ignorePattern, keyMappings);
