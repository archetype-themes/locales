const fs = require('fs');
const path = require('path');
const glob = require('glob');

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

processJsonFiles();