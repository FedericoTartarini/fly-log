import React, { useState } from "react";
import { Button, Group, List, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { updateFlightForUser } from "../utils/flightService";
import type { StatusChange } from "../utils/statusDiff";

interface StatusChangesNoticeProps {
  uid: string;
  flightId: string;
  changes: StatusChange[];
  /** The notification this sits in, so the buttons can dismiss it. */
  notificationId: string;
  /** Whether the check ran by itself on save, which the footnote explains. */
  automatic?: boolean;
}

/**
 * Body of the notification shown after a status check, automatic or manual:
 * what the airline's schedule says differently, and whether to take it.
 * Nothing is written unless the user chooses Apply.
 */
const StatusChangesNotice: React.FC<StatusChangesNoticeProps> = ({
  uid,
  flightId,
  changes,
  notificationId,
  automatic = true,
}) => {
  const { t } = useTranslation("flights");
  const [saving, setSaving] = useState(false);

  const apply = async () => {
    setSaving(true);
    try {
      await updateFlightForUser(
        uid,
        flightId,
        Object.fromEntries(changes.map(({ field, found }) => [field, found])),
      );
      notifications.hide(notificationId);
    } catch (error) {
      console.error("Applying status changes failed", error);
      notifications.show({
        title: t("form.notifications.error_title"),
        message: t("auto_check.apply_failed"),
        color: "red",
      });
      setSaving(false);
    }
  };

  return (
    <Stack gap="xs">
      <List size="sm" spacing={2}>
        {changes.map(({ field, entered, found }) => (
          <List.Item key={field}>
            {t(`auto_check.fields.${field}`)}: {entered ?? "—"} → <b>{found}</b>
          </List.Item>
        ))}
      </List>
      <Group gap="xs">
        <Button size="xs" loading={saving} onClick={apply}>
          {t("auto_check.apply")}
        </Button>
        <Button
          size="xs"
          variant="subtle"
          disabled={saving}
          onClick={() => notifications.hide(notificationId)}
        >
          {t("auto_check.keep_mine")}
        </Button>
      </Group>
      {automatic && (
        <Text size="xs" c="dimmed">
          {t("auto_check.source")}
        </Text>
      )}
    </Stack>
  );
};

export default StatusChangesNotice;
