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

function removeEmpty(obj) {
  Object.keys(obj).forEach(key => {
      // If the value is an object, recursively call the function
      if (typeof obj[key] === 'object' && obj[key] !== null) {
          removeEmpty(obj[key]);

          // If the nested object is now empty after the recursive call, delete it
          if (Object.keys(obj[key]).length === 0) {
              delete obj[key];
          }
      } else if (obj[key] === null || obj[key] === '' || obj[key] === undefined) {
          // If the value is null, empty string, or undefined, delete the key
          delete obj[key];
      }
  });

  return obj;
}

const files = glob.sync('./locales/*.json');

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify(removeEmpty(sortObjectKeys(data)), null, 2));
});