// Utility script used to update a locale key from an old path to a new path across all files
// and then update any matching liquid files with that new path
//
// Useful for re-organizing locale keys in this repo
//
// node ./scripts/move-replace.js '../components/components/**/*.liquid' some.old.path some.new.path
//

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function getKeyPathValue(obj, keyPath) {
    const keys = keyPath.split('.');
    let current = obj;
    for (let key of keys) {
        if (current[key] === undefined) return undefined;
        current = current[key];
    }
    return current;
}

function setKeyPathValue(obj, keyPath, value) {
    const keys = keyPath.split('.');
    let current = obj;
    keys.forEach((key, index) => {
        if (index === keys.length - 1) {
            current[key] = value;
        } else {
            current[key] = current[key] || {};
            current = current[key];
        }
    });
}

function unsetKeyPath(obj, keyPath) {
    const keys = keyPath.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined) return;
        current = current[keys[i]];
    }
    delete current[keys[keys.length - 1]];
}

function findSimilarKeys(obj, valueToMatch, prefix = '') {
    let keys = [];
    for (let key in obj) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys = [...keys, ...findSimilarKeys(obj[key], valueToMatch, fullPath)];
        } else if (obj[key] === valueToMatch) {
            keys.push(fullPath);
        }
    }
    return keys;
}

function modifyJsonFiles(oldPath, newPath, similarKeys) {
    const files = glob.sync('./locales/*.json');

    files.forEach(file => {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const originalValue = getKeyPathValue(data, oldPath);
        similarKeys.forEach(key => {
            if (key !== newPath) {
                unsetKeyPath(data, key);
            }
        });
        setKeyPathValue(data, newPath, originalValue);
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    });
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

function updateLiquidFiles(liquidFilesPattern, similarKeys, newPath) {
  const files = glob.sync(liquidFilesPattern);
  console.log(`Found ${files.length} .liquid files to process.`);

  files.forEach(file => {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      similarKeys.filter(onlyUnique).forEach(oldPath => {
          // Regex pattern to match {{ 'old.path' | t: }} pattern
          const regex = new RegExp(`${oldPath.replace(/\./g, '\\.')}`, 'g');

          // Check if the current file contains the old path
          if (regex.test(content)) {
              console.log(`Updating key '${oldPath}' to '${newPath}' in ${file}`);
              content = content.replace(regex, `${newPath}`);
              modified = true;
          }
      });

      if (modified) {
          fs.writeFileSync(file, content);
          console.log(`File ${file} has been updated.`);
      } else {
          // console.log(`No changes made to ${file}.`);
      }
  });
}

const [liquidFilesPattern, oldPath, newPath] = process.argv.slice(2);

const enDefaultData = JSON.parse(fs.readFileSync('./locales/en.default.json', 'utf8'));
const valueToMatch = getKeyPathValue(enDefaultData, oldPath);
const similarKeys = findSimilarKeys(enDefaultData, valueToMatch);

console.log(similarKeys)

similarKeys.push(oldPath); // Include the original oldPath in similarKeys for replacement
modifyJsonFiles(oldPath, newPath, similarKeys);
updateLiquidFiles(liquidFilesPattern, similarKeys, newPath); 