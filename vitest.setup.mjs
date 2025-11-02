import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";

// Import translation files for tests
import enFlights from "./public/locales/en/flights.json";
import enCommon from "./public/locales/en/common.json";
import itFlights from "./public/locales/it/flights.json";
import itCommon from "./public/locales/it/common.json";

// Initialize i18n for tests
const resources = {
  en: {
    flights: enFlights,
    common: enCommon,
  },
  it: {
    flights: itFlights,
    common: itCommon,
  },
};

await i18next.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  ns: ["common", "flights"],
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

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
