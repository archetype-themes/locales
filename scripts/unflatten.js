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

function unflattenObject(data) {
  var result = {}
  for (var i in data) {
    var keys = i.split('.')
    keys.reduce(function(r, e, j) {
      return r[e] || (r[e] = isNaN(Number(keys[j + 1])) ? (keys.length - 1 == j ? data[i] : {}) : [])
    }, result)
  }
  return result
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

const files = glob.sync('./locales/*.json');

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const unflattenedObject = unflattenObject(data);
  fs.writeFileSync(file, JSON.stringify(sortObjectKeys(unflattenedObject), null, 4));
});
