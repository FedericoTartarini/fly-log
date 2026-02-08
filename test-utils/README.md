Test i18n helper and global setup

This project initializes i18n globally for the test environment so components have translations available by default.

Where the global setup lives

- `vitest.setup.mjs` — used by Vitest; it imports the app `src/i18n` instance and injects the English JSON resources from `public/locales/en/*.json`.

What the global setup does

- Loads English translations for the app namespaces (`common`, `login`, `about`, `flights`, `landing`, `translation`).
- Sets `lng: 'en'` and `fallbackLng: 'en'` for tests.
- Disables `react.useSuspense` so components render synchronously during tests.

When to override the global setup

- Use the global setup for most unit tests — no per-test i18n initialization is required.
- Override when you need:
  - A different language (e.g., `it`) for a specific test.
  - Custom/mock resources for a particular test case.

How to override (recommended)

- Use the helper `test-utils/initI18n.js` which wraps `i18n.init` for tests.

Example: override to Italian in a test file

```javascript
import { initTestI18n } from "../../test-utils/initI18n.js";
import i18n from "../i18n";

beforeAll(() => {
  initTestI18n({
    lng: "it",
    resources: {
      it: { common: { hello: "Ciao" } },
    },
    ns: ["common"],
    defaultNS: "common",
  });
});

// Then render components that rely on i18n; they will use the Italian resource above
```

Alternative: call `i18n.init` directly

```javascript
import i18n from "../i18n";

beforeAll(() => {
  i18n.init({
    lng: "it",
    resources: { it: { common: { key: "value" } } },
    ns: ["common"],
    defaultNS: "common",
    react: { useSuspense: false },
  });
});
```

Notes

- Calling `i18n.init` multiple times is safe in the test environment and is commonly used to provide per-test overrides.
- If you need to reset i18n between tests, call `i18n.changeLanguage('en')` or re-init with desired resources in `beforeEach` / `afterEach` hooks.
