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

  // On phones, swiping down closes the sheet, as native bottom sheets do. A
  // swipe on the header always counts. A swipe on the content counts only when
  // the content is scrolled to the top, so scrolling back up still works.
  // Touch events, not pointer events, because the browser cancels a pointer
  // once it starts scrolling, and only a touchmove that is not passive can stop
  // that scroll. The sheet's wrapper moves, not the sheet, whose transform
  // Mantine's slide-up transition owns.
  React.useEffect(() => {
    if (!isPhone || !opened) return;
    let drag: {
      x: number;
      y: number;
      inner: HTMLElement;
      sheet: HTMLElement;
      onHeader: boolean;
      active: boolean;
    } | null = null;

    const start = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const inner = target.closest<HTMLElement>(`.${classes.sheetInner}`);
      const sheet = target.closest<HTMLElement>(`.${classes.sheet}`);
      const t = e.touches[0];
      drag =
        inner && sheet && t && e.touches.length === 1
          ? {
              x: t.clientX,
              y: t.clientY,
              inner,
              sheet,
              onHeader: !!target.closest(`.${classes.sheetDrag}`),
              active: false,
            }
          : null;
    };
    const move = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!drag || !t) return;
      const dx = t.clientX - drag.x;
      const dy = t.clientY - drag.y;
      if (!drag.active) {
        // Wait for a few pixels of movement, so a tap stays a tap.
        if (Math.abs(dy) < 8) return;
        const down = dy > 0 && Math.abs(dy) > Math.abs(dx);
        if (!down || (!drag.onHeader && drag.sheet.scrollTop > 0)) {
          drag = null; // A scroll, not a swipe.
          return;
        }
        drag.active = true;
        drag.inner.dataset.dragging = "";
      }
      e.preventDefault();
      drag.inner.style.transform = `translateY(${Math.max(0, dy)}px)`;
    };
    const end = (e: TouchEvent) => {
      const d = drag;
      drag = null;
      if (!d?.active) return;
      delete d.inner.dataset.dragging;
      const dy = (e.changedTouches[0]?.clientY ?? d.y) - d.y;
      if (e.type === "touchend" && dy > 100) onClose();
      else d.inner.style.transform = "";
    };

    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, [isPhone, opened, onClose]);

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
          header: `${classes.sheetHeader} ${classes.sheetDrag}`,
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
