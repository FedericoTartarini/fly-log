import React, { lazy, Suspense } from "react";
import { Loader, Modal } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import type { enhancedFlight } from "../types/enhancedFlight";
import { getAirportCity } from "../utils/airportUtils";
import classes from "./FlightsList.module.css";

const FlightEntryForm = lazy(() => import("./FlightEntryForm"));
const FlightDetailsModal = lazy(() => import("./FlightDetailsModal"));

/**
 * The flight details pop-up, with the edit form it opens on top. Shared by
 * the Flights list and the next-flight stub on the boarding pass.
 */
const FlightDetailsSheet: React.FC<{
  /** The list the open flight is looked up in. */
  flights: enhancedFlight[];
  flightId: string | null;
  opened: boolean;
  onClose: () => void;
}> = ({ flights, flightId, opened, onClose }) => {
  const { t } = useTranslation("flights");
  const isPhone = useMediaQuery("(max-width: 53.74em)");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editFlight, setEditFlight] = React.useState<enhancedFlight | null>(
    null,
  );
  // Derived from the live list, not snapshotted, so a status write lands in
  // the open modal. The flip side is that the flight can vanish underneath it
  // (deleted, or filtered out), which would leave an empty titled modal open.
  const flight = flights.find((f) => f.id === flightId) ?? null;
  React.useEffect(() => {
    if (opened && flightId !== null && flight === null) onClose();
  }, [opened, flightId, flight, onClose]);

  return (
    <>
      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("form.labels.edit_flight")}
        // Only the page colour of the details sheet, not its phone layout.
        classNames={{
          content: classes.sheetHeader,
          header: classes.sheetHeader,
        }}
        // Opened from inside the details modal below, so it must stack above
        // it regardless of DOM order - Mantine gives every Modal the same
        // default z-index (200), and same-z-index elements paint in DOM
        // order, which would otherwise put the later (details) modal on top.
        zIndex={1000}
      >
        {editFlight && (
          <Suspense fallback={<Loader size="sm" />}>
            <FlightEntryForm
              flight={editFlight}
              onSaved={() => setEditOpen(false)}
            />
          </Suspense>
        )}
      </Modal>

      <Modal
        opened={opened}
        onClose={onClose}
        title={
          flight
            ? t("list.cities", {
                from:
                  getAirportCity(flight.departure_airport_iata) ??
                  flight.departure_airport_iata,
                to:
                  getAirportCity(flight.arrival_airport_iata) ??
                  flight.arrival_airport_iata,
              })
            : ""
        }
        size="lg"
        zIndex={600}
        // A sheet from the bottom on phones, a centred modal on wider screens.
        {...(isPhone && { transitionProps: { transition: "slide-up" } })}
        closeButtonProps={{ size: "lg" }}
        classNames={{
          inner: classes.sheetInner,
          content: classes.sheet,
          header: classes.sheetHeader,
          title: classes.sheetTitle,
        }}
      >
        {flight && (
          <Suspense fallback={<Loader size="sm" />}>
            <FlightDetailsModal
              flight={flight}
              onEdit={(f) => {
                setEditFlight(f);
                setEditOpen(true);
              }}
            />
          </Suspense>
        )}
      </Modal>
    </>
  );
};

export default FlightDetailsSheet;
