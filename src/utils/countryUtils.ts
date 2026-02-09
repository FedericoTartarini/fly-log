import i18n from "i18next";

const displayNamesCache = new Map<string, Intl.DisplayNames>();

export const getCountryName = (countryCode: string): string => {
  try {
    const locale = (i18n && i18n.language) || "en";
    let displayNames = displayNamesCache.get(locale);
    if (!displayNames) {
      displayNames = new Intl.DisplayNames([locale], { type: "region" });
      displayNamesCache.set(locale, displayNames);
    }
    const normalizedCountryCode = countryCode.trim().toUpperCase();
    return displayNames.of(normalizedCountryCode) || normalizedCountryCode;
  } catch {
    return countryCode.trim().toUpperCase();
  }
};
