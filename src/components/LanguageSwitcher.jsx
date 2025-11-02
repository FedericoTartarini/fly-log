import React from "react";
import { Select } from "@mantine/core";
import { useTranslation } from "react-i18next";
import classes from "../pages/MyAppShell.module.css";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const value = i18n.language || "en";

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
      label="Language"
      size="xs"
      value={value}
      onChange={handleChange}
      data={[
        { value: "en", label: "English" },
        { value: "it", label: "Italiano" },
      ]}
      sx={{ minWidth: 110 }}
      className={classes.control}
    />
  );
};

export default LanguageSwitcher;
