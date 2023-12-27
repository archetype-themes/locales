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

function compareObjects(obj1, obj2) {
  let addedKeys = [];
  let removedKeys = [];
  let changedKeys = [];

  Object.keys(obj1).forEach(key => {
      if (!obj2.hasOwnProperty(key)) {
          removedKeys.push(key);
      } else if (obj1[key] !== obj2[key]) {
          changedKeys.push(key);
      }
  });

  Object.keys(obj2).forEach(key => {
      if (!obj1.hasOwnProperty(key)) {
          addedKeys.push(key);
      }
  });

  return { added: addedKeys, removed: removedKeys, changed: changedKeys };
}

function getFilePaths() {
  const {defaultCode, storefront} = config.repos.find(({repo}) => repo === "archetype-themes/locales");
  const currentFilePath = `locales/${defaultCode}.default.json`;
  const previousFilePath = `locales/${defaultCode}.default.old.json`;
  const otherLocalePaths = storefront.map(code => `locales/${code}.json`).filter(code => code !== `locales/${defaultCode}.json`);

  return { currentFilePath,previousFilePath,otherLocalePaths}
}

async function updateAllLocaleFiles() {
  const {currentFilePath, previousFilePath, otherLocalePaths} = getFilePaths()

  const currentFileContent = JSON.parse(fs.readFileSync(currentFilePath, 'utf8'));
  const previousFileContent = JSON.parse(fs.readFileSync(previousFilePath, 'utf8'));
  const changes = compareObjects(previousFileContent, currentFileContent);

  for (const localePath of otherLocalePaths) {
      const language = localePath.split('/').pop().split('.')[0]
      await updateLocaleFile(localePath, changes, language, currentFileContent)
  }
}

// Function to update a locale file
async function updateLocaleFile(localePath, changes, targetLanguage, currentFileContent) {
  let localeData = JSON.parse(fs.readFileSync(localePath, 'utf8'));

  // Process new translations
for (const keyPath of changes.added) {
  if (typeof localeData[keyPath] === 'undefined') {
      let originalText = currentFileContent[keyPath];
      let translatedText = await translateText(originalText, targetLanguage, keyPath);

      localeData[keyPath] = translatedText;
  } else {
      console.log(`"${keyPath}": Skip translating to: '${targetLanguage}' because a translation was already provided`);
  }
}

// Process changed translations
for (const keyPath of changes.changed) {
  let originalText = currentFileContent[keyPath];
  let translatedText = await translateText(originalText, targetLanguage, keyPath);

  localeData[keyPath] = translatedText;
}

  removeKeysFromLocale(localeData, changes.removed);

  fs.writeFileSync(localePath, JSON.stringify(sortObjectKeys(localeData), null, 4));
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

updateAllLocaleFiles()
    .then(() => console.log('Locale files updated.'))
    .catch(err => console.error('Error updating locale files:', err));
