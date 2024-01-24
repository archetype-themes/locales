// Utility script to compare locales files across this repo + theme project for matching values 
// and then update liquid files in theme project with locale repo keys
//
// Useful for updating your theme project to use locale keys from this project.
// 
// node ./scripts/find-and-replace.js localesRepoFile themeLocalesFile directoryPattern ignorePattern
// 
// Example:
// node ./scripts/find-and-replace.js ./locales/en.default.json ../expanse/locales/en.default.json ../expanse/**/*.liquid ../expanse/snippets/*.liquid


const fs = require('fs');
const path = require('path');
const glob = require('glob');

function readJsonFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        process.exit(1);
    }
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

function searchAndReplaceInLiquidFiles(directoryPattern, ignorePattern, mappings) {
    const options = { ignore: ignorePattern };
    
    const files = glob.sync(directoryPattern, options);


    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        for (let keyB in mappings) {
            mappings[keyB].forEach(keyA => {
                // console.log(keyB)
                const regex = new RegExp(`'${keyB.replace(/\./g, '\\.')}'`, 'g');
                if (regex.test(content)) {
                    console.log(`Replacing '${keyB}' with '${keyA}' in ${file}`);
                    content = content.replace(regex, `'${keyA}'`);
                    modified = true;
                }
            });
        }

        if (modified) {
            fs.writeFileSync(file, content);
        }
    });
}

const [fileAPath, fileBPath, directoryPattern, ignorePattern] = process.argv.slice(2);

console.log(fileAPath, fileBPath, directoryPattern, ignorePattern)

const fileA = readJsonFile(fileAPath);
const fileB = readJsonFile(fileBPath);

function buildKeyMappings(obj, baseObj, baseKey = '') {
    for (let key in obj) {
        const value = obj[key];
        const newBaseKey = baseKey ? `${baseKey}.${key}` : key;

        if (typeof value === 'object' && value !== null) {
            buildKeyMappings(value, baseObj, newBaseKey);
        } else {
            const keyBs = findAllKeyPaths(baseObj, value);
            keyBs.forEach(keyB => {
                if (!keyMappings[keyB]) {
                    keyMappings[keyB] = [];
                }
                keyMappings[keyB].push(newBaseKey);
            });
        }
    }
}

const keyMappings = {};
buildKeyMappings(fileA, fileB);

searchAndReplaceInLiquidFiles(directoryPattern, ignorePattern, keyMappings);
