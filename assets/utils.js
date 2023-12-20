export function dotNotate(obj,target,prefix) {
  target = target || {},
  prefix = prefix || "";

  Object.keys(obj).forEach(function(key) {
    if ( typeof(obj[key]) === "object" && obj[key] !== null ) {
      dotNotate(obj[key],target,prefix + key + ".");
    } else {
      return target[prefix + key] = obj[key];
    }
  });

  return target;
}

export function getSupportedLanguages() {
  return ['de', 'en', 'es', 'fr', 'it', 'pt-BR', 'pt-PT']
}

export function getReadableLanguage(languageCode) {
  // Split the language code into language and region
  const [language, region] = languageCode.split('-');

  // Create an Intl.DisplayNames instance for languages
  const languageDisplay = new Intl.DisplayNames([languageCode], { type: 'language' });
  const regionDisplay = region ? new Intl.DisplayNames([languageCode], { type: 'region' }) : null;

  // Get the readable names
  const readableLanguage = languageDisplay.of(language);
  const readableRegion = region ? ` (${regionDisplay.of(region)})` : '';

  return readableLanguage + readableRegion + ` (${languageCode})`;
}

export function getClosestLanguageMatch(list, code) {
  const [language, region] = code.split('-') // Split language key into parts, e.g. en-US into ['en','US']

  // Find an exact match if possible
  if (list.includes(code)) {
    return code
  } 
  
  // Find a general match if possible, e.g en-US matches to en.json
  else if (list.includes(language)) {
    return language;
  }

  // Return first supported Language
  else {
    return list[0]
  }
}

export function containsHTML(str) {
  const pattern = /<[^>]+>/;
  
  // If simple regex detect html elements, proceed to more coputationally intensive HTML check
  if (pattern.test(str)) {
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.childNodes.length > 0 && div.childNodes[0].nodeType === 1;
  
  // Else not html
  } else {
    return false
  }
}

export function containsLiquidInterpolation(str) {
  const liquidInterpolationPattern = /\{\{.*?\}\}/;
  return liquidInterpolationPattern.test(str);
}

export function createLiquidTranslationString(input, key) {
  // Regular expression to match Liquid interpolation patterns
  const interpolationPattern = /\{\{\s*(\w+)\s*\}\}/g;
  let match;
  let liquidParts = [];
  let liquidString = `{{ '${key}' | t`;

  // Loop over all matches in the input string
  while ((match = interpolationPattern.exec(input)) !== null) {
      // Add each match to the liquidParts array
      liquidParts.push(`${match[1]}: "[${match[1]}]"`);
  }

  // If there are any captured parts, join them and append to the liquidString
  if (liquidParts.length > 0) {
      liquidString += ": " + liquidParts.join(', ');
  }

  return liquidString + " }}";
}