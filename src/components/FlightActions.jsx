import React, { useState } from "react";
import { ActionIcon, Button, Menu, Modal, Text } from "@mantine/core";
import { IconDotsVertical, IconInfoCircle, IconPencil, IconTrash } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import { deleteFlightForUser } from "../utils/flightService";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";

// Row action menu for edit/delete operations.
const FlightActions = ({ flight, onEdit, onViewDetails }) => {
  const { user } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useTranslation("flights");

  const handleDelete = async () => {
    if (!user || !user.uid) {
      notifications.show({
        title: t("actions.not_signed_in"),
        message: "",
        color: "red",
      });
      return;
    }
    setIsDeleting(true);
    try {
      // The Firestore listener removes the row as soon as the local write
      // lands, and puts it back on its own if the write is rejected.
      await deleteFlightForUser(user.uid, flight.id);

      notifications.show({
        title: t("actions.deleted_title"),
        message: t("actions.deleted_message"),
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: t("actions.delete_error_title"),
        message: (err && err.message) || String(err),
        color: "red",
      });
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Menu withArrow>
        <Menu.Target>
          <ActionIcon aria-label={t("actions.open_menu")} variant={"subtle"}>
            <IconDotsVertical />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconInfoCircle size={14} />}
            onClick={() => onViewDetails && onViewDetails(flight)}
            data-testid={`flight-actions-details-${flight.id}`}
          >
            {t("actions.view_details")}
          </Menu.Item>
          <Menu.Item
            leftSection={<IconPencil size={14} />}
            onClick={() => onEdit && onEdit(flight)}
            data-testid={`flight-actions-edit-${flight.id}`}
          >
            {t("actions.edit")}
          </Menu.Item>
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={() => setConfirmOpen(true)}
            data-testid={`flight-actions-delete-${flight.id}`}
          >
            {t("actions.delete")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={confirmOpen}
        onClose={() => !isDeleting && setConfirmOpen(false)}
        closeOnClickOutside={!isDeleting}
        closeOnEscape={!isDeleting}
        withCloseButton={!isDeleting}
        title={t("actions.confirm_delete_title")}
        centered
      >
        <Text>{t("actions.confirm_delete_message")}</Text>
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}
        >
          <Button
            variant="default"
            onClick={() => !isDeleting && setConfirmOpen(false)}
            disabled={isDeleting}
            mr={8}
            data-testid={`flight-delete-cancel-${flight.id}`}
          >
            {t("actions.cancel")}
          </Button>
          <Button
            color="red"
            onClick={handleDelete}
            loading={isDeleting}
            data-testid={`flight-delete-confirm-${flight.id}`}
          >
            {t("actions.delete")}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default FlightActions;
