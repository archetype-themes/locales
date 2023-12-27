// Utility script used to update a locale key from an old path to a new path across all files
// and then update any matching liquid files with that new path
//
// node ./scripts/move-replace.js '../components/components/**/*.liquid' some.old.path some.new.path
//

const fs = require('fs');
const path = require('path');
const glob = require('glob');

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

// Function to update JSON files
function updateJsonFiles(directoryPattern, oldPath, newPath) {
    const jsonFiles = glob.sync(directoryPattern);

    jsonFiles.forEach(file => {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));

        if (data[oldPath] !== undefined) {
            data[newPath] = data[oldPath];
            delete data[oldPath];
        }

        fs.writeFileSync(file, JSON.stringify(sortObjectKeys(data), null, 4));
    });
}

// Function to update .liquid files
function updateLiquidFiles(liquidFilesPattern, oldPath, newPath) {
    const liquidFiles = glob.sync(liquidFilesPattern);

    liquidFiles.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');

        // Regex pattern to match the old path
        const regex = new RegExp(`'${oldPath.replace(/\./g, '\\.')}'`, 'g');

        if (regex.test(content)) {
            content = content.replace(regex, `'${newPath}'`);
            fs.writeFileSync(file, content);
        }
    });
}

// Main function to run the script
function main() {
    const [liquidFilesPattern, oldPath, newPath] = process.argv.slice(2);

    if (!liquidFilesPattern || !oldPath || !newPath) {
        console.error('Usage: node move-replace.js <liquidFilesPattern> <oldPath> <newPath>');
        process.exit(1);
    }

    const jsonDirectoryPattern = './locales/*.json';

    updateJsonFiles(jsonDirectoryPattern, oldPath, newPath);
    updateLiquidFiles(liquidFilesPattern, oldPath, newPath);

    console.log(`Updated JSON and .liquid files from '${oldPath}' to '${newPath}'.`);
}

main();