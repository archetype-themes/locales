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

function sortObjectKeys(obj) {
    // Create a new object with sorted keys
    const sortedObject = {};
  
    // Sort the keys of the current object
    Object.keys(obj).sort().forEach(key => {
        // Check if the value is an object and not an array
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            // Recursively sort the keys of the nested object
            sortedObject[key] = sortObjectKeys(obj[key]);
        } else {
            // Directly assign the value if it's not an object
            sortedObject[key] = obj[key];
        }
    });
  
    return sortedObject;
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

function findSimilarKeys(obj, keyPath, prefix = '') {
    let keys = [];
    const nestedObj = getKeyPathValue(obj, keyPath);
    if (typeof nestedObj === 'object' && nestedObj !== null) {
        for (let key in nestedObj) {
            const fullPath = `${keyPath}.${key}`;
            keys.push(fullPath);
            if (typeof nestedObj[key] === 'object' && nestedObj[key] !== null) {
                keys = [...keys, ...findSimilarKeys(nestedObj[key], fullPath, fullPath)];
            }
        }
    }
    return keys;
}

function modifyJsonFiles(oldPath, newPath, similarKeys) {
    const files = glob.sync('./locales/*.json');

    files.forEach(file => {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const originalValue = getKeyPathValue(data, oldPath);

        if (similarKeys.length === 1) {
            setKeyPathValue(data, newPath, originalValue);
            unsetKeyPath(data, oldPath);
        } else {
            similarKeys.forEach(key => {
                const updatedKey = key.replace(oldPath, newPath);
                if (updatedKey !== newPath) {
                    setKeyPathValue(data, updatedKey, getKeyPathValue(data, key));
                    unsetKeyPath(data, key);
                }
            });
        }
        
        fs.writeFileSync(file, JSON.stringify(sortObjectKeys(data), null, 4));
    });
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

function updateLiquidFiles(liquidFilesPattern, similarKeys, oldPath, newPath) {
  const files = glob.sync(liquidFilesPattern);
  console.log(`Found ${files.length} .liquid files to process.`);

  files.forEach(file => {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      similarKeys.filter(onlyUnique).forEach(key => {
          // Regex pattern to match {{ 'old.path' | t: }} pattern
          const regex = new RegExp(`'${key.replace(/\./g, '\\.')}'`, 'g');
          const updatedKey = key.replace(oldPath, newPath);

          // Check if the current file contains the old path
          if (regex.test(content)) {
              console.log(`Updating key '${key}' to '${updatedKey}' in ${file}`);
              content = content.replace(regex, `'${updatedKey}'`);
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
const similarKeys = findSimilarKeys(enDefaultData, oldPath);

similarKeys.push(oldPath); // Include the original oldPath in similarKeys for replacement
console.log(similarKeys)
modifyJsonFiles(oldPath, newPath, similarKeys);
updateLiquidFiles(liquidFilesPattern, similarKeys, oldPath, newPath);