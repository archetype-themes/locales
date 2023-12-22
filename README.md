# Ecommerce Locales Library

E-commerce websites, like those powered by [Shopify themes](https://shopify.dev/docs/themes), contain strings of text like "Add to cart" or "Continue shopping". If you want your website to be accessible in multiple languages, those strings need to be translated. Why should you do the work of translating strings that have already been translated!?

Introducing the Archetype Themes Ecommerce Locales Library, your (open) source for all of your e-commerce translations! Instead of translating the same strings over and over again in private silos, let's pool translations into one place so we everyone wins!

### How to use

Using these translations in your next Shopify theme project is as easy as:

1. **Copy the JSON files, in their entirety, into your latest theme project.** There is no penalty to having extra translations included in your theme.
2. **Use the [Locales Detective](https://archetype-themes.github.io/locales/) to find a translation you need.** You can search this repo or [shopify/dawn](https://github.com/Shopify/dawn) and you can select your search input language.
3. **Use the copy button to copy the Liquid** (e.g. `{{ add_to_cart | t }}`) to your clipboard and paste into your theme!

As a bonus, the copy button can even handle translations with [interpolations](https://shopify.dev/docs/themes/architecture/locales/storefront-locale-files#interpolation). So a translation like `"You save {{ saved_amount }}"` will generate Liquid like `{{ 'you_save_amount' | t: saved_amount: "[saved_amount]" }}`! 

### Contribute your translations

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
