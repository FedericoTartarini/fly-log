import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";

// Namespaces: 'common' for shared strings (nav, footer, etc) and per-page namespaces like 'login'
// Resolves once the detected language's files have loaded, which main.jsx
// waits for before it adopts the prerendered landing page.
export const i18nReady = i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ["en", "it"],
    fallbackLng: "en",
    debug: false,
    ns: ["common", "login", "flights", "about", "landing", "tour"],
    defaultNS: "common",
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
