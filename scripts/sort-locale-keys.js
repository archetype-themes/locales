// Utility script that sorts JSON file keys alphabetically

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

const files = glob.sync('./locales/*.json');

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify(sortObjectKeys(data), null, 4));
});