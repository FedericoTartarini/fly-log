import React, { useState } from "react";
import { Button, Modal } from "@mantine/core";
import { useTranslation } from "react-i18next";
import useFlightStore from "../store.ts";
import FlightEntryForm from "./FlightEntryForm.tsx";
import NoFlightsCard from "./NoFlightsCard.jsx";
import { useShallow } from "zustand/react/shallow";

// CTA bar for creating flights or showing the empty state.
const FlightsTopBar = ({ fullWidth = false }) => {
  const { allFlights, fetchFlights } = useFlightStore(
    useShallow((s) => ({
      allFlights: s.allFlights,
      fetchFlights: s.fetchFlights,
    })),
  );
  const [formOpened, setFormOpened] = useState(false);
  const { t } = useTranslation("flights");

  const handleFlightSaved = () => {
    setFormOpened(false);
    fetchFlights();
  };

  return (
    <>
      <Modal
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        title={t("form.add_new_flight")}
        size="lg"
      >
        <FlightEntryForm onSaved={handleFlightSaved} />
      </Modal>

      {/* Show NoFlightsCard when there are no flights */}
      {!Array.isArray(allFlights) || allFlights.length === 0 ? (
        <NoFlightsCard setFormOpened={setFormOpened} />
      ) : (
        <Button
          variant="gradient"
          onClick={() => setFormOpened(true)}
          fullWidth={fullWidth}
        >
          {t("form.add_new_flight")}
        </Button>
      )}
    </>
  );
};

export default FlightsTopBar;
