const fs = require('fs');
const path = require('path');
const { isUnexpected, default: TextTranslationClient } = require("@azure-rest/ai-translation-text");
const config = require('../locales.config.json');

require('dotenv').config();

const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT;
const key = process.env.AZURE_TRANSLATOR_SUBSCRIPTION_KEY;
const region = process.env.AZURE_TRANSLATOR_REGION;

const translationClient = TextTranslationClient(endpoint, { key, region });

// Replaces Liquid placeholders (e.g., {{ variable }}) with tokens to prevent translation
function protectPlaceholders(text) {
  const placeholders = [];
  const protectedText = text.replace(/\{\{[^}]+\}\}/g, (match) => {
    placeholders.push(match);
    return `__PH${placeholders.length - 1}__`;
  });
  return { protectedText, placeholders };
}

function restorePlaceholders(text, placeholders) {
  return text.replace(/__PH(\d+)__/g, (match, index) => {
    return placeholders[parseInt(index)] || match;
  });
}

function removeKeysFromLocale(localeData, keysToRemove) {
  keysToRemove.forEach(keyPath => {
    const keyParts = keyPath.split('.');
    const lastKey = keyParts.pop();
    const lastObj = keyParts.reduce((obj, key) => obj[key] || {}, localeData);

    if (lastObj && lastObj.hasOwnProperty(lastKey)) {
      delete lastObj[lastKey];
    }
  });
}

async function translateText(text, targetLanguage, keyPath) {
  try {
    const { protectedText, placeholders } = protectPlaceholders(text);
    const translateResponse = await translationClient.path("/translate").post({
      body: [{ text: protectedText }],
      queryParameters: { to: targetLanguage, from: "en" },
    });

    if (isUnexpected(translateResponse)) {
      throw translateResponse.body;
    }

    const translations = translateResponse.body;
    for (const translation of translations) {
      const translatedText = restorePlaceholders(
        translation?.translations[0]?.text,
        placeholders
      );
      console.log(
        `"${keyPath}": Translated to: '${translation?.translations[0]?.to}' and the result is: '${translatedText}'.`
      );
      return translatedText;
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
  const { defaultCode, storefront, schema } = config;

  const storefrontLocales = {
    currentFilePath: `locales/${defaultCode}.default.json`,
    previousFilePath: `locales/${defaultCode}.default.old.json`,
    otherLocalePaths: storefront
      .map(code => `locales/${code}.json`)
      .filter(code => code !== `locales/${defaultCode}.json` && !code.includes('.schema.json'))
  };

  const schemaLocales = {
    currentFilePath: `locales/${defaultCode}.default.schema.json`,
    previousFilePath: `locales/${defaultCode}.default.old.schema.json`,
    otherLocalePaths: schema
      .map(code => `locales/${code}.schema.json`)
      .filter(code => code !== `locales/${defaultCode}.schema.json` && code.includes('.schema.json'))
  };

  return { storefrontLocales, schemaLocales };
}

async function updateAllLocaleFiles({ currentFilePath, previousFilePath, otherLocalePaths }) {
  const currentFileContent = JSON.parse(fs.readFileSync(currentFilePath, 'utf8'));
  const previousFileContent = JSON.parse(fs.readFileSync(previousFilePath, 'utf8'));
  const changes = compareNestedObjects(previousFileContent, currentFileContent);

  for (const localePath of otherLocalePaths) {
    const language = localePath.split('/').pop().split('.')[0];
    let localeData = JSON.parse(fs.readFileSync(localePath, 'utf8'));

    await getMissingTranslations(localeData, currentFileContent, language);
    await updateLocaleFile(localePath, changes, language, currentFileContent);

    fs.writeFileSync(localePath, JSON.stringify(sortObjectKeys(localeData), null, 2) + '\n');
  }
}

async function getMissingTranslations(localeData, referenceData, targetLanguage) {
  const missingTranslations = {};

  function findMissingKeys(obj, refObj, currentPath = '') {
    for (const key in refObj) {
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

function setKeyPathValue(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = current[keys[i]] || {};
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
}

async function updateLocaleFile(localePath, changes, targetLanguage, currentFileContent) {
  let localeData = JSON.parse(fs.readFileSync(localePath, 'utf8'));

  for (const keyPath of changes.added) {
    const keyParts = keyPath.split('.');
    const lastKey = keyParts.pop();
    const lastObj = keyParts.reduce((obj, key) => obj[key] = obj[key] || {}, localeData);

    // Skip translation if a value already exists (allows manual translations)
    if (typeof lastObj[lastKey] === 'undefined') {
      const originalText = keyParts.reduce((obj, key) => obj[key], currentFileContent)[lastKey];
      const translatedText = await translateText(originalText, targetLanguage, keyPath);
      lastObj[lastKey] = translatedText;
    } else {
      console.log(`"${keyPath}": Skip translating to: '${targetLanguage}' because a translation was already provided`);
    }
  }

  for (const keyPath of changes.changed) {
    const keyParts = keyPath.split('.');
    const lastKey = keyParts.pop();
    const lastObj = keyParts.reduce((obj, key) => obj[key] = obj[key] || {}, localeData);

    const originalText = keyParts.reduce((obj, key) => obj[key], currentFileContent)[lastKey];
    const translatedText = await translateText(originalText, targetLanguage, keyPath);
    lastObj[lastKey] = translatedText;
  }

  removeKeysFromLocale(localeData, changes.removed);
  fs.writeFileSync(localePath, JSON.stringify(sortObjectKeys(localeData), null, 2) + '\n');
}

function sortObjectKeys(obj) {
  if (obj === null || obj === undefined) {
    console.error('Attempted to sort keys of null or undefined object');
    return {};
  }

  const sortedObject = {};

  Object.keys(obj).sort().forEach(key => {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      sortedObject[key] = sortObjectKeys(obj[key]);
    } else {
      sortedObject[key] = obj[key];
    }
  });

  return sortedObject;
}

const { storefrontLocales, schemaLocales } = getFilePaths();

updateAllLocaleFiles(storefrontLocales)
  .then(() => updateAllLocaleFiles(schemaLocales))
  .then(() => console.log('Locale files updated.'))
  .catch(err => console.error('Error updating locale files:', err));
