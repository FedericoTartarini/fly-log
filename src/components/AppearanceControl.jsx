import React, { useId } from "react";
import {
  SegmentedControl,
  Stack,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { useTranslation } from "react-i18next";

// System, Light or Dark. Mantine stores the choice in localStorage, so it
// survives a reload, and "auto" follows the device setting.
export default function AppearanceControl() {
  const { t } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const labelId = useId();

  return (
    <Stack gap={4} px="xs">
      <Text id={labelId} size="xs" fw={500}>
        {t("appearance.label")}
      </Text>
      <SegmentedControl
        aria-labelledby={labelId}
        size="xs"
        value={colorScheme}
        onChange={setColorScheme}
        data={[
          { value: "auto", label: t("appearance.system") },
          { value: "light", label: t("appearance.light") },
          { value: "dark", label: t("appearance.dark") },
        ]}
      />
    </Stack>
  );
}
