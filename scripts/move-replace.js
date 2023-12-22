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
        fs.writeFileSync(file, JSON.stringify(sortObjectKeys(data), null, 4));
    });
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

function updateLiquidFiles(similarKeys, newPath) {
  const files = glob.sync('../components/components/**/*.liquid');
  console.log(`Found ${files.length} .liquid files to process.`);

  files.forEach(file => {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      similarKeys.filter(onlyUnique).forEach(oldPath => {
          // Regex pattern to match {{ 'old.path' | t: }} pattern
          const regex = new RegExp(`'${oldPath.replace(/\./g, '\\.')}'`, 'g');

          // Check if the current file contains the old path
          if (regex.test(content)) {
              console.log(`Updating key '${oldPath}' to '${newPath}' in ${file}`);
              content = content.replace(regex, `'${newPath}'`);
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

function flattenObject(obj, prefix = '') {
    let flattened = {};

    for (const key in obj) {
        const pref = prefix.length ? prefix + '.' : '';

        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(flattened, flattenObject(obj[key], pref + key));
        } else {
            flattened[pref + key] = obj[key];
        }
    }

    return flattened;
}

function processJsonFiles() {
    const files = glob.sync('./locales/*.json');

    if (!fs.existsSync('./flat')) {
        fs.mkdirSync('./flat');
    }

    files.forEach(file => {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const flattenedData = flattenObject(data);
        const baseName = path.basename(file);
        fs.writeFileSync(`./flat/${baseName}`, JSON.stringify(flattenedData, null, 2));
    });
}

const [oldPath, newPath] = process.argv.slice(2);

const enDefaultData = JSON.parse(fs.readFileSync('./locales/en.default.json', 'utf8'));
const valueToMatch = getKeyPathValue(enDefaultData, oldPath);
const similarKeys = findSimilarKeys(enDefaultData, valueToMatch);

console.log(similarKeys)

similarKeys.push(oldPath); // Include the original oldPath in similarKeys for replacement
modifyJsonFiles(oldPath, newPath, similarKeys);
updateLiquidFiles(similarKeys, newPath); 

processJsonFiles();