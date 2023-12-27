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

function findKeyMappings(fileA, fileB) {
    const mappings = {};
    const missingMappings = [];

    function findMapping(keyPath, obj) {
        for (let key in obj) {
            const newKeyPath = keyPath ? `${keyPath}.${key}` : key;
            if (typeof obj[key] === 'object') {
                findMapping(newKeyPath, obj[key]);
            } else {
                const matchingKeyA = Object.keys(fileA).find(k => fileA[k].toLowerCase() === obj[key].toLowerCase());
                if (matchingKeyA) {
                    mappings[newKeyPath] = matchingKeyA;
                } else {
                    missingMappings.push(newKeyPath);
                }
            }
        }
    }

    findMapping('', fileB);
    return { mappings, missingMappings };
}

function searchAndReplaceInLiquidFiles(directoryPattern, mappings) {
    const files = glob.sync(directoryPattern);

    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        Object.entries(mappings).forEach(([keyB, keyA]) => {
            const regex = new RegExp(`'${keyB.replace(/\./g, '\\.')}'`, 'g');
            if (regex.test(content)) {
                console.log(`Found match for '${keyB}' in ${file}`);
                content = content.replace(regex, `'${keyA}'`);
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(file, content);
        }
    });
}


const fileA = readJsonFile('./locales/en.default.json');
const fileB = readJsonFile('./old/en.default.json');
const liquidFilesPattern = '/Users/thomaskelly/github/archetype-themes/components/**/*.liquid';

const { mappings, missingMappings } = findKeyMappings(fileA, fileB);

console.log('Missing mappings:', missingMappings);

searchAndReplaceInLiquidFiles(liquidFilesPattern, mappings);