import i18n from "i18next";

export const getCountryName = (countryCode: string): string => {
  try {
    const locale = (i18n && i18n.language) || "en";
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    return displayNames.of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
};
