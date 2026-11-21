vi.mock("./FlightDetailsModal", () => ({ default: () => null }));
vi.mock("../utils/airportUtils", () => ({
  getAirportCity: (iata: string) =>
    ({ SYD: "Sydney", LHR: "London" })[iata] ?? iata,
}));

import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, vi, expect, beforeEach } from "vitest";
import FlightDetailsSheet from "./FlightDetailsSheet";
import { render } from "../../test-utils";
import type { enhancedFlight } from "../types/enhancedFlight";

const flight = {
  id: "1",
  departure_airport_iata: "SYD",
  arrival_airport_iata: "LHR",
} as enhancedFlight;

// jsdom has no PointerEvent, and without one fireEvent drops clientY.
window.PointerEvent ??= class extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
} as typeof PointerEvent;

describe("FlightDetailsSheet on a phone", () => {
  beforeEach(() => {
    // Every media query matches, so the sheet takes its phone layout.
    vi.mocked(window.matchMedia).mockImplementation(
      (query) =>
        ({
          matches: true,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
  });

  const dragTitle = async (to: number) => {
    const onClose = vi.fn();
    render(
      <FlightDetailsSheet
        flights={[flight]}
        flightId="1"
        opened
        onClose={onClose}
      />,
    );
    const title = await screen.findByText("Sydney to London");
    // useMediaQuery reports the phone only after its first effect.
    await waitFor(() => {
      fireEvent.pointerDown(title, { pointerId: 1, clientY: 0 });
      expect(title.closest("[data-dragging]")).not.toBeNull();
    });
    fireEvent.pointerMove(title, { pointerId: 1, clientY: to });
    fireEvent.pointerUp(title, { pointerId: 1, clientY: to });
    return onClose;
  };

  it("closes when the header is dragged down far enough", async () => {
    expect(await dragTitle(150)).toHaveBeenCalledTimes(1);
  });

  it("snaps back after a short drag", async () => {
    expect(await dragTitle(40)).not.toHaveBeenCalled();
  });
});
