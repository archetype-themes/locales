// node ./scripts/compare-json.js path/to/fileA.json path/to/fileB.json

const fs = require('fs');
const path = require('path');

function readJsonFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        process.exit(1);
    }
}

function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
}

function compareJsonFiles(fileA, fileB) {
    const flatFileA = flattenObject(fileA);
    const flatFileB = flattenObject(fileB);

    const keysFileA = new Set(Object.keys(flatFileA));
    const keysFileB = new Set(Object.keys(flatFileB));

    const onlyInFileA = [...keysFileA].filter(k => !keysFileB.has(k));
    const onlyInFileB = [...keysFileB].filter(k => !keysFileA.has(k));

    return { onlyInFileA, onlyInFileB };
}

const fileAPath = process.argv[2]; // e.g., 'path/to/fileA.json'
const fileBPath = process.argv[3]; // e.g., 'path/to/fileB.json'

const fileA = readJsonFile(fileAPath);
const fileB = readJsonFile(fileBPath);

const { onlyInFileA, onlyInFileB } = compareJsonFiles(fileA, fileB);

console.log('Keys only in File A:', onlyInFileA);
console.log('Keys only in File B:', onlyInFileB);