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
    <Stack gap={8}>
      <Text id={labelId} fw={600}>
        {t("appearance.label")}
      </Text>
      <SegmentedControl
        aria-labelledby={labelId}
        size="md"
        fullWidth
        // 36 px options on a 4 px track make the 44 px touch target.
        styles={{ label: { minHeight: 36, alignContent: "center" } }}
        value={colorScheme}
        onChange={setColorScheme}
        data={[
          { value: "auto", label: t("appearance.system") },
          { value: "light", label: t("appearance.light") },
          { value: "dark", label: t("appearance.dark") },
        ]}
      />
      <Text size="sm" c="dimmed">
        {t("appearance.hint")}
      </Text>
    </Stack>
  );
}
