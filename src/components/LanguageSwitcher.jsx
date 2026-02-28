import React from "react";
import { Select } from "@mantine/core";
import { useTranslation } from "react-i18next";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "it", label: "Italiano" },
];

const normalizeLanguage = (i18n) => {
  const current = i18n.resolvedLanguage || i18n.language;
  if (!current) {
    return LANGUAGE_OPTIONS[0].value;
  }

  const fallback = current.split("-")[0];
  const match = LANGUAGE_OPTIONS.find(
    ({ value }) => value === current || value === fallback,
  );

  return match ? match.value : LANGUAGE_OPTIONS[0].value;
};

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const value = normalizeLanguage(i18n);

  const handleChange = (val) => {
    if (!val) return;
    i18n.changeLanguage(val);
    try {
      window.localStorage.setItem("i18nextLng", val);
    } catch {
      // ignore
    }
  };

  return (
    <Select
      label={t("language")}
      size="xs"
      value={value}
      onChange={handleChange}
      data={LANGUAGE_OPTIONS}
      withinPortal
      dropdownPosition="bottom"
      px="xs"
      sx={{
        minWidth: 110,
      }}
      styles={() => ({
        dropdown: {
          zIndex: 10_000,
        },
      })}
      data-cy="language-select"
    />
  );
};

export default LanguageSwitcher;
