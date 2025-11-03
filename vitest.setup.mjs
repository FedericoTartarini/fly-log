import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

const { getComputedStyle } = window;
window.getComputedStyle = (elt) => getComputedStyle(elt);
window.HTMLElement.prototype.scrollIntoView = () => {};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

// --- Global i18n test initialization ---
// We set up the application's i18n instance once for all tests to avoid the HTTP backend
// and to ensure translated strings are available out-of-the-box during unit tests.
//
// Behavior:
// - The English translations from `public/locales/en/*.json` are loaded into the i18n
//   instance (namespaces: common, login, about, flights, landing, translation).
// - `react.useSuspense` is disabled for tests so components render synchronously.
//
// How to override in a specific test file:
// - If a test needs different resources or a different language, simply call the
//   `initTestI18n` helper (test-utils/initI18n.js) from that test to re-initialize
//   i18n with in-memory resources, e.g.:
//     import { initTestI18n } from '../../test-utils/initI18n';
//     beforeAll(() => {
//       initTestI18n({ lng: 'it', resources: { it: { common: {...} } }, ns: ['common'], defaultNS: 'common' });
//     });
//
// - Alternatively, tests can call `i18n.init({...})` directly if they prefer.
//
// Note: calling `i18n.init` repeatedly is safe in the test environment.

// Use the app i18n instance but inject in-memory resources to avoid HTTP backend and language detection in tests.
import i18n from "./src/i18n";
import aboutEn from "./public/locales/en/about.json";
import commonEn from "./public/locales/en/common.json";
import flightsEn from "./public/locales/en/flights.json";
import landingEn from "./public/locales/en/landing.json";
import loginEn from "./public/locales/en/login.json";
import translationEn from "./public/locales/en/translation.json";

// initialize i18n for tests once
// Note: calling init repeatedly is safe for our usage here; we disable suspense for tests.
i18n.init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      about: aboutEn,
      common: commonEn,
      flights: flightsEn,
      landing: landingEn,
      login: loginEn,
      translation: translationEn,
    },
  },
  ns: ["common", "login", "about", "flights", "landing", "translation"],
  defaultNS: "common",
  react: { useSuspense: false },
  interpolation: { escapeValue: false },
});

export {};
