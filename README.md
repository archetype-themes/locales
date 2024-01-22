# Ecommerce Locales Library

Ecommerce websites, like those powered by [Shopify themes](https://shopify.dev/docs/themes), contain strings of text like "Add to cart" or "Continue shopping". If you want your website to be accessible in multiple languages, those strings need to be translated. Why should you do the work of translating strings that have already been translated!?

Introducing the Archetype Themes Ecommerce Locales Library, your (open) source for all of your e-commerce translations! Instead of translating the same strings over and over again in private silos, let's pool translations into one place so we everyone wins!

### How to use

Using these [locales files](https://shopify.dev/docs/themes/architecture/locales) in your next Shopify theme project is as easy as:

1. **Copy the JSON files, in their entirety, into your latest theme project.** There is no penalty to having extra translations included in your theme (just a [limit of 3400](https://shopify.dev/docs/themes/architecture/locales#requirements-and-limitations)).
2. **Use the [Locales Detective](https://archetype-themes.github.io/locales/) to find a translation you need.** You can search this repo or [shopify/dawn](https://github.com/Shopify/dawn) and you can select your search input language.
3. **Use the copy button to copy the Liquid** (e.g. `{{ add_to_cart | t }}`) to your clipboard and paste into your theme!

As a bonus, the copy button can even handle translations with [interpolations](https://shopify.dev/docs/themes/architecture/locales/storefront-locale-files#interpolation). So a translation like `"You save {{ saved_amount }}"` will generate Liquid like `{{ 'you_save_amount' | t: saved_amount: "[saved_amount]" }}`! 

### Contributing

Don't have translations for every language? No problem! Thanks to Github Actions + Microsoft Azure AI Translator, a followup pull request containing any missing translations you contribute will be automatically created. Yes, the AI translations even respect interpolated value placeholders and HTML, leaving them unmodified!

Check out the [CONTRIBUTING.md](/archetype-themes/locales/blob/main/CONTRIBUTING.md) for more details
