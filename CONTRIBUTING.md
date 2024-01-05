Have some translations that are missing from the repo? Spotted a translation that could be improved? Please open a pull-request and contribute!

Don't have translations for every language? No problem! Thanks to Github Actions + [Microsoft Azure AI Translator](https://azure.microsoft.com/en-us/products/ai-services/ai-translator), a followup pull request containing any missing translations you contribute will be automatically created. Yes, the AI translations even respect interpolated value placeholders and HTML, leaving them unmodified!

Here are a few things to keep in mind:

- This is an English centric library and the `en.default.json` will act as the source of truth for translations keys and values.
- A new proposed translation should always include an English version inside of `en.default.json`.

To contribute a new translation:

1. Fork this repo
2. Add your new key:value to `en.default.json`
3. Add any translated values you have to other locales files
4. Commit your change and open a pull request with your changes
5. Merge your changes
6. A Github Action will be triggered to add any missing translations to other locales files!
