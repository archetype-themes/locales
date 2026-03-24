const fs = require('fs');
const config = require('../locales.config.json');

const { defaultCode, storefront, schema } = config;

function sortObjectKeys(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      sorted[key] = sortObjectKeys(obj[key]);
    } else {
      sorted[key] = obj[key];
    }
  });
  return sorted;
}

function removeOrphanKeys(locale, reference, path = '') {
  const removed = [];

  for (const key of Object.keys(locale)) {
    const fullPath = path ? `${path}.${key}` : key;

    if (!(key in reference)) {
      delete locale[key];
      removed.push(fullPath);
    } else if (
      typeof locale[key] === 'object' && locale[key] !== null &&
      typeof reference[key] === 'object' && reference[key] !== null
    ) {
      removed.push(...removeOrphanKeys(locale[key], reference[key], fullPath));
      if (Object.keys(locale[key]).length === 0) {
        delete locale[key];
      }
    }
  }

  return removed;
}

function processLocaleFiles(referencePath, localePaths) {
  const reference = JSON.parse(fs.readFileSync(referencePath, 'utf8'));
  let totalRemoved = 0;

  for (const localePath of localePaths) {
    const locale = JSON.parse(fs.readFileSync(localePath, 'utf8'));
    const removed = removeOrphanKeys(locale, reference);

    if (removed.length > 0) {
      fs.writeFileSync(localePath, JSON.stringify(sortObjectKeys(locale), null, 2) + '\n');
      console.log(`${localePath}: removed ${removed.length} orphan key(s)`);
      removed.forEach(key => console.log(`  - ${key}`));
      totalRemoved += removed.length;
    }
  }

  return totalRemoved;
}

const storefrontPaths = storefront
  .filter(code => code !== defaultCode)
  .map(code => `locales/${code}.json`);

const schemaPaths = schema
  .filter(code => code !== defaultCode)
  .map(code => `locales/${code}.schema.json`);

const totalRemoved =
  processLocaleFiles(`locales/${defaultCode}.default.json`, storefrontPaths) +
  processLocaleFiles(`locales/${defaultCode}.default.schema.json`, schemaPaths);

console.log(`\nDone. Removed ${totalRemoved} orphan key(s) total.`);
