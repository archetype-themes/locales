# Contributing

## Adding a Translation

1. Add the English string to `en.default.json` (storefront) or `en.default.schema.json` (theme editor)
2. Open a pull request
3. Once merged, a GitHub Action automatically translates and creates a follow-up PR

### Structure

Storefront translations use three categories:

```json
{
  "actions": { },   // Verbs: "Add to cart", "Subscribe", "Continue shopping"
  "info": { },      // Messages: "Out of stock", "Thanks for subscribing"
  "labels": { }     // Nouns: "Email", "Quantity", "Price"
}
```

### Interpolation

Use `{{ variable }}` for dynamic values:

```json
{
  "actions": {
    "back_to": "Back to {{ collection }}"
  },
  "info": {
    "you_save_amount": "You save {{ saved_amount }}"
  }
}
```

## Manual Translations

If you know the correct translation for other languages, add them in the same PR. The automation will skip any keys that already have translations.

## Fixing a Translation

Edit the translation directly in the appropriate locale file and open a PR.
