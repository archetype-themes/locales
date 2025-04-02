/*
Tests to write at some point:
- Adding a new translation to en.default.json will translate and add missing translations to other locales
- Adding a new translation to en.default.json with skip translating if other translation is provided/exists
- Changing translation value in en.default.json will update translation values in other locales
- Removing translation value in en.default.json will remove that translation from other locales
*/


const fs = require('fs');
const path = require('path');
const { isUnexpected, default: TextTranslationClient} = require("@azure-rest/ai-translation-text");
const config = require('../locales.config.json');

require('dotenv').config()

const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT;
const key = process.env.AZURE_TRANSLATOR_SUBSCRIPTION_KEY;
const region = process.env.AZURE_TRANSLATOR_REGION

const translationClient = TextTranslationClient(endpoint, {key, region});

// Function to remove keys from locale file
function removeKeysFromLocale(localeData, keysToRemove) {
    keysToRemove.forEach(keyPath => {
        let keyParts = keyPath.split('.');
        let lastKey = keyParts.pop();
        let lastObj = keyParts.reduce((obj, key) => obj[key] || {}, localeData);

        if (lastObj && lastObj.hasOwnProperty(lastKey)) {
            delete lastObj[lastKey];
        }
    });
}

// Function to translate text
async function translateText(text, targetLanguage, keyPath) {
  try {
    const inputText = [{ text }];
    const parameters = {
      to: targetLanguage,
      from: "en",
    };
    const translateResponse = await translationClient.path("/translate").post({
      body: inputText,
      queryParameters: parameters,
    });

    if (isUnexpected(translateResponse)) {
      throw translateResponse.body;
    }

    const translations = translateResponse.body;
    for (const translation of translations) {
      console.log(
        `"${keyPath}": Translated to: '${translation?.translations[0]?.to}' and the result is: '${translation?.translations[0]?.text}'.`
      );
      return translation?.translations[0]?.text
    }
  } catch (error) {
      console.error('Error translating text:', error);
      return null;
  }
}

function compareNestedObjects(obj1, obj2, parentKey = '') {
  let addedKeys = [];
  let removedKeys = [];
  let changedKeys = [];

  Object.keys(obj1).forEach(key => {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      if (!obj2.hasOwnProperty(key)) {
          removedKeys.push(fullKey);
      } else if (typeof obj1[key] === 'object' && obj1[key] !== null && typeof obj2[key] === 'object' && obj2[key] !== null) {
          const { added, removed, changed } = compareNestedObjects(obj1[key], obj2[key], fullKey);
          addedKeys = addedKeys.concat(added);
          removedKeys = removedKeys.concat(removed);
          changedKeys = changedKeys.concat(changed);
      } else if (obj1[key] !== obj2[key]) {
          changedKeys.push(fullKey);
      }
  });

  Object.keys(obj2).forEach(key => {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      if (!obj1.hasOwnProperty(key)) {
          addedKeys.push(fullKey);
      }
  });

  return { added: addedKeys, removed: removedKeys, changed: changedKeys };
}

function getFilePaths() {
  const {defaultCode, storefront, schema} = config.repos.find(({repo}) => repo === "archetype-themes/locales");
  const storefrontLocales = {
    currentFilePath: `locales/${defaultCode}.default.json`,
    previousFilePath: `locales/${defaultCode}.default.old.json`,
    otherLocalePaths: storefront.map(code => `locales/${code}.json`).filter(code => code !== `locales/${defaultCode}.json` && !code.includes('.schema.json'))
  }
  const schemaLocales = {
    currentFilePath: `locales/${defaultCode}.default.schema.json`,
    previousFilePath: `locales/${defaultCode}.default.old.schema.json`,
    otherLocalePaths: schema.map(code => `locales/${code}.schema.json`).filter(code => code !== `locales/${defaultCode}.schema.json` && code.includes('.schema.json'))
  }
  return { storefrontLocales, schemaLocales }
}

async function updateAllLocaleFiles({currentFilePath, previousFilePath, otherLocalePaths}) {
  const currentFileContent = JSON.parse(fs.readFileSync(currentFilePath, 'utf8'));
  const previousFileContent = JSON.parse(fs.readFileSync(previousFilePath, 'utf8'));
  const changes = compareNestedObjects(previousFileContent, currentFileContent);

  for (const localePath of otherLocalePaths) {
      const language = localePath.split('/').pop().split('.')[0];
      let localeData = JSON.parse(fs.readFileSync(localePath, 'utf8'));

      await getMissingTranslations(localeData, currentFileContent, language);
      await updateLocaleFile(localePath, changes, language, currentFileContent);

      fs.writeFileSync(localePath, JSON.stringify(sortObjectKeys(localeData), null, 2));
  }
}

// Function to get missing translations
async function getMissingTranslations(localeData, referenceData, targetLanguage) {
  const missingTranslations = {};

  function findMissingKeys(obj, refObj, currentPath = '') {
      for (let key in refObj) {
          const newPath = currentPath ? `${currentPath}.${key}` : key;
          if (typeof refObj[key] === 'object' && refObj[key] !== null) {
              if (typeof obj[key] !== 'object') obj[key] = {};
              findMissingKeys(obj[key], refObj[key], newPath);
          } else if (typeof obj[key] === 'undefined') {
              missingTranslations[newPath] = refObj[key];
          }
      }
  }

  findMissingKeys(localeData, referenceData);
  for (const keyPath in missingTranslations) {
      const translatedText = await translateText(missingTranslations[keyPath], targetLanguage, keyPath);
      setKeyPathValue(localeData, keyPath, translatedText);
  }
}

// Set value at a specific key path in an object
function setKeyPathValue(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = current[keys[i]] || {};
      current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// Function to update a locale file
async function updateLocaleFile(localePath, changes, targetLanguage, currentFileContent) {
  let localeData = JSON.parse(fs.readFileSync(localePath, 'utf8'));

  // Process new translations
  for (const keyPath of changes.added) {
      let keyParts = keyPath.split('.');
      let lastKey = keyParts.pop();
      let lastObj = keyParts.reduce((obj, key) => obj[key] = obj[key] || {}, localeData);

      // Only translate a new locale if a value has not already been set.
      // This allows contributors to manually add translations if they know the other language
      if (typeof lastObj[lastKey] === 'undefined') {
        let originalText = keyParts.reduce((obj, key) => obj[key], currentFileContent)[lastKey];
        let translatedText = await translateText(originalText, targetLanguage, keyPath);

        lastObj[lastKey] = translatedText;
      } else {
        console.log (`"${keyPath}": Skip translating to: '${targetLanguage}' because a translation was already provided`)
      }
  }

  // Process changed translations
  for (const keyPath of changes.changed) {
    let keyParts = keyPath.split('.');
    let lastKey = keyParts.pop();
    let lastObj = keyParts.reduce((obj, key) => obj[key] = obj[key] || {}, localeData);

    let originalText = keyParts.reduce((obj, key) => obj[key], currentFileContent)[lastKey];
    let translatedText = await translateText(originalText, targetLanguage, keyPath);

    lastObj[lastKey] = translatedText;
  }

  removeKeysFromLocale(localeData, changes.removed);

  fs.writeFileSync(localePath, JSON.stringify(sortObjectKeys(localeData), null, 2));
}

function sortObjectKeys(obj) {
  // Add null/undefined check to prevent errors
  if (obj === null || obj === undefined) {
    console.error('Attempted to sort keys of null or undefined object');
    return {}; // Return empty object instead of failing
  }

  // Create a new object with sorted keys
  const sortedObject = {};

  // Sort the keys of the current object
  Object.keys(obj).sort().forEach(key => {
      // Check if the value is an object and not an array
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          // Recursively sort the keys of the nested object
          sortedObject[key] = sortObjectKeys(obj[key]);
      } else {
          // Directly assign the value if it's not an object
          sortedObject[key] = obj[key];
      }
  });

  return sortedObject;
}

const {storefrontLocales, schemaLocales} = getFilePaths()

updateAllLocaleFiles(storefrontLocales)
    .then(() => updateAllLocaleFiles(schemaLocales))
    .then(() => console.log('Locale files updated.'))
    .catch(err => console.error('Error updating locale files:', err));
