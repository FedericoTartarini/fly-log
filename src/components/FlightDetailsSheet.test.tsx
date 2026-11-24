vi.mock("./FlightDetailsModal", () => ({ default: () => null }));
vi.mock("../utils/airportUtils", () => ({
  getAirportCity: (iata: string) =>
    ({ SYD: "Sydney", LHR: "London" })[iata] ?? iata,
}));

import { screen, waitFor } from "@testing-library/react";
import { describe, it, vi, expect, beforeEach } from "vitest";
import FlightDetailsSheet from "./FlightDetailsSheet";
import { render } from "../../test-utils";
import type { enhancedFlight } from "../types/enhancedFlight";

const flight = {
  id: "1",
  departure_airport_iata: "SYD",
  arrival_airport_iata: "LHR",
} as enhancedFlight;

// jsdom's TouchEvent needs real Touch objects, which jsdom cannot make, so
// build a plain event and attach the one touch the sheet reads.
const touch = (el: Element, type: string, clientY: number) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const touches = [{ clientX: 0, clientY }];
  Object.assign(event, {
    touches: type === "touchend" ? [] : touches,
    changedTouches: touches,
  });
  el.dispatchEvent(event);
  return event;
};

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

  const swipe = async (
    pick: (title: HTMLElement) => Element,
    to: number,
    scrollTop = 0,
  ) => {
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
    // Mantine's scroll lock also cancels touchmoves in jsdom, so a cancelled
    // event proves nothing. The sheet marks itself while it follows a finger.
    const dragging = () => title.closest("[data-dragging]") !== null;
    // useMediaQuery reports the phone only after its first effect, so wait
    // until a short header swipe takes hold, then let it snap back.
    await waitFor(() => {
      touch(title, "touchstart", 0);
      touch(title, "touchmove", 20);
      expect(dragging()).toBe(true);
    });
    touch(title, "touchend", 20);

    const el = pick(title);
    // jsdom has no layout, so scrollTop has to be stubbed.
    Object.defineProperty(el.closest("section")!, "scrollTop", {
      value: scrollTop,
    });
    touch(el, "touchstart", 0);
    touch(el, "touchmove", to);
    const draggedAlong = dragging();
    touch(el, "touchend", to);
    return { onClose, draggedAlong };
  };

  const header = (title: HTMLElement) => title;
  const body = (title: HTMLElement) =>
    title.closest("section")!.querySelector(".mantine-Modal-body")!;

  it("closes when the header is swiped down far enough", async () => {
    expect((await swipe(header, 150)).onClose).toHaveBeenCalledTimes(1);
  });

  it("snaps back after a short swipe", async () => {
    const { onClose, draggedAlong } = await swipe(header, 40);
    expect(draggedAlong).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when the content is swiped down at the top", async () => {
    expect((await swipe(body, 150)).onClose).toHaveBeenCalledTimes(1);
  });

  it("lets scrolled content scroll instead of closing", async () => {
    const { onClose, draggedAlong } = await swipe(body, 150, 200);
    expect(draggedAlong).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});
