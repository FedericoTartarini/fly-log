import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enFlights from '../public/locales/en/flights.json';
import enCommon from '../public/locales/en/common.json';
import itFlights from '../public/locales/it/flights.json';
import itCommon from '../public/locales/it/common.json';

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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: navigator.language.split('-')[0] || 'en', // Browser language detection
    fallbackLng: 'en',
    ns: ['common', 'flights'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
