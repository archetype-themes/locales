// Utility script to compare locales files across this repo + theme project for matching values 
// and then update liquid files in theme project with locale repo keys
//
// Useful for updating your theme project to use locale keys from this project.
//
// node scripts/update-to-new-locales.js ../fetch/locales/en.default.schema.json locales/en.default.schema.json ../fetch
//


const fs = require('fs');
const path = require('path');

function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            Object.assign(acc, flattenObject(obj[key], newKey));
        } else {
            acc[newKey] = obj[key];
        }
        return acc;
    }, {});
}

function findMissingValues(oldObj, newObj) {
    const flatOldObj = flattenObject(oldObj);
    const flatNewObj = flattenObject(newObj);
    const missingValues = [];

    // Collect values from the new JSON for comparison
    const newValues = new Set(Object.values(flatNewObj));

    for (const [keyOld, valueOld] of Object.entries(flatOldObj)) {
        if (!newValues.has(valueOld)) {
            missingValues.push(keyOld);
        }
    }
    return missingValues;
}

function checkKeysInFiles(missingKeys, directory) {
    const files = fs.readdirSync(directory, { withFileTypes: true });
    const usedKeys = new Set();

    files.forEach(file => {
        if (file.isFile()) {
            const filePath = path.join(directory, file.name);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            missingKeys.forEach(key => {
                const keyWithPrefix = `t:${key}`;
                if (fileContent.includes(keyWithPrefix)) {
                    usedKeys.add(key);
                }
            });
        } else if (file.isDirectory()) {
            const subdirUsedKeys = checkKeysInFiles(missingKeys, path.join(directory, file.name));
            subdirUsedKeys.forEach(key => usedKeys.add(key));
        }
    });

    return usedKeys;
}

function createValueMapping(oldObj, newObj) {
    const flatOldObj = flattenObject(oldObj);
    const flatNewObj = flattenObject(newObj);
    const mapping = new Map();

    for (const [keyOld, valueOld] of Object.entries(flatOldObj)) {
        for (const [keyNew, valueNew] of Object.entries(flatNewObj)) {
            if (valueOld === valueNew) {
                mapping.set(keyOld, keyNew);
                break;
            }
        }
    }
    return mapping;
}

function updateOtherJsonFiles(directory, oldFile, mapping) {
    const oldFileExtension = path.extname(oldFile);
    const files = fs.readdirSync(directory);
    const missingTranslations = [];

    files.forEach(file => {
        if (file.endsWith('schema.json')) {
            const filePath = path.join(directory, file);
            let jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            let updatedJsonData = applyMappingToStructure(jsonData, mapping);

            // Check for missing translations
            for (const newKey of mapping.values()) {
                if (!(newKey in flattenObject(updatedJsonData))) {
                    missingTranslations.push(`Missing translation in ${file}: ${newKey}`);
                }
            }

            // Sort keys alphabetically and write back
            const sortedJsonData = sortObjectKeys(updatedJsonData);
            fs.writeFileSync(filePath, JSON.stringify(sortedJsonData, null, 2), 'utf8');
        }
    });

    return missingTranslations;
}

function applyMappingToStructure(jsonData, mapping) {
    const updatedJsonData = {};
    const flatJsonData = flattenObject(jsonData);

    Object.keys(flatJsonData).forEach(oldKey => {
        if (mapping.has(oldKey)) {
            const newKey = mapping.get(oldKey);
            const keys = newKey.split('.');
            let currentLevel = updatedJsonData;

            keys.forEach((key, index) => {
                if (index === keys.length - 1) {
                    currentLevel[key] = flatJsonData[oldKey];
                } else {
                    currentLevel[key] = currentLevel[key] || {};
                    currentLevel = currentLevel[key];
                }
            });
        }
    });

    return updatedJsonData;
}

function sortObjectKeys(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sortObjectKeys);

    const sortedObj = {};
    Object.keys(obj).sort().forEach(key => {
        sortedObj[key] = sortObjectKeys(obj[key]);
    });
    return sortedObj;
}

function updateFilesInDirectory(directory, mapping) {
    const filesToUpdate = [];

    function readDirRecursive(dir) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        files.forEach(file => {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                readDirRecursive(fullPath);
            } else if (file.name.endsWith('.liquid') || file.name.endsWith('.json')) {
                filesToUpdate.push(fullPath);
            }
        });
    }

    readDirRecursive(directory);

    filesToUpdate.forEach(filePath => {
        let fileContent = fs.readFileSync(filePath, 'utf8');
        mapping.forEach((newKey, oldKey) => {
            const oldKeyWithPrefix = `t:${oldKey}`;
            const newKeyWithPrefix = `t:${newKey}`;
            fileContent = fileContent.replaceAll(oldKeyWithPrefix, newKeyWithPrefix);
        });
        fs.writeFileSync(filePath, fileContent, 'utf8');
    });
}

function addMissingKeysToJson(newJson, oldJson, missingKeys) {
    if (!newJson.unsorted) {
        newJson.missing = {};
    }

    let count = 0;
    missingKeys.forEach((key) => {
        // Handle nested keys
        const keys = key.split('.');
        let currentLevel = oldJson;
        let keyFound = true;

        for (let i = 0; i < keys.length; i++) {
            if (currentLevel[keys[i]] !== undefined) {
                currentLevel = currentLevel[keys[i]];
            } else {
                keyFound = false;
                break;
            }
        }

        if (keyFound && !Object.values(newJson.missing).includes(currentLevel)) {
            count += 1
            newJson.missing[`${count}`] = currentLevel;
        }
    });

    return newJson;
}

function updateAssociatedJsonFiles(oldDirectory, newDirectory, oldJson, missingKeys) {
    const schemaFiles = fs.readdirSync(oldDirectory).filter(file => file.endsWith('.schema.json'));

    schemaFiles.forEach(file => {
        const oldFilePath = path.join(oldDirectory, file);
        const newFilePath = path.join(newDirectory, file);

        if (fs.existsSync(newFilePath)) {
            const oldFileJson = JSON.parse(fs.readFileSync(oldFilePath, 'utf8'));
            let newFileJson = JSON.parse(fs.readFileSync(newFilePath, 'utf8'));

            newFileJson = addMissingKeysToJson(newFileJson, oldFileJson, missingKeys);
            fs.writeFileSync(newFilePath, JSON.stringify(newFileJson, null, 2), 'utf8');
        }
    });
}

function main() {
    const [jsonFileOldPath, jsonFileNewPath, filesDirectory] = process.argv.slice(2);

    if (!jsonFileOldPath || !jsonFileNewPath || !filesDirectory) {
        console.error('Usage: node script.js <path-to-JsonFileOld> <path-to-JsonFileNew> <filesDirectory>');
        process.exit(1);
    }

    const jsonFileOld = JSON.parse(fs.readFileSync(jsonFileOldPath, 'utf8'));
    const jsonFileNew = JSON.parse(fs.readFileSync(jsonFileNewPath, 'utf8'));
    const oldDirectory = path.dirname(jsonFileOldPath);
    const newDirectory = path.dirname(jsonFileNewPath);

    const potentiallyMissingValues = findMissingValues(jsonFileOld, jsonFileNew);
    const actuallyUsedKeys = checkKeysInFiles(potentiallyMissingValues, filesDirectory);

    actuallyUsedKeys.forEach(key => console.log(`Key with missing value in new JSON and used in files: ${key}`));

    if (actuallyUsedKeys.size > 0) {
        addMissingKeysToJson(jsonFileNew, jsonFileOld, actuallyUsedKeys);
        updateAssociatedJsonFiles(oldDirectory, newDirectory, jsonFileOld, actuallyUsedKeys);
        console.log('Missing keys in new locales file detected. Added missing keys to new locales file in a "unsorted" nested object. Please confirm key name of new keys and rerun this script.')
        return;
    } 


    const valueMapping = createValueMapping(jsonFileOld, jsonFileNew);

    const missingTranslations = updateOtherJsonFiles(path.dirname(jsonFileOldPath), jsonFileOldPath, valueMapping);
    missingTranslations.forEach(msg => console.log(msg));

    updateFilesInDirectory(filesDirectory, valueMapping);
}

main();
