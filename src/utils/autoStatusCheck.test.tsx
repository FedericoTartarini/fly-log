import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./flightStatusService", () => ({ checkFlightStatus: vi.fn() }));
vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn(), hide: vi.fn() },
}));

import { notifications } from "@mantine/notifications";
import { checkFlightStatus } from "./flightStatusService";
import { autoCheckSavedFlights } from "./autoStatusCheck";

const NOW = new Date(2026, 6, 10, 12, 0);

const saved = (id: string, departure_date: Date) => ({
  id,
  departure_date,
  departure_time: "21:00",
  departure_airport_iata: "SYD",
  arrival_airport_iata: "SIN",
  airline_iata: "QF",
  flight_number: "1",
});

// Only the fields the diff reads; the real response has many more.
type Leg = Awaited<ReturnType<typeof checkFlightStatus>>;
const leg = {
  departure: { scheduledTime: { local: "2026-07-12 21:30+10:00" } },
} as Leg;

describe("autoCheckSavedFlights", () => {
  beforeEach(() => vi.clearAllMocks());

  it("checks only flights within the window and offers the differences", async () => {
    vi.mocked(checkFlightStatus).mockResolvedValue(leg);

    await autoCheckSavedFlights(
      "uid",
      [
        saved("soon", new Date(2026, 6, 12)),
        saved("later", new Date(2026, 8, 1)),
      ],
      NOW,
    );

    expect(checkFlightStatus).toHaveBeenCalledOnce();
    expect(vi.mocked(checkFlightStatus).mock.calls[0]?.[1]).toMatchObject({
      id: "soon",
    });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ id: "status-changes-soon", autoClose: false }),
    );
  });

  it("stays quiet when the schedule matches or the check fails", async () => {
    vi.mocked(checkFlightStatus)
      .mockResolvedValueOnce({
        departure: { scheduledTime: { local: "2026-07-12 21:00+10:00" } },
      } as Leg)
      .mockRejectedValueOnce(new Error("No matching flight found"));

    await autoCheckSavedFlights(
      "uid",
      [
        saved("same", new Date(2026, 6, 12)),
        saved("missing", new Date(2026, 6, 13)),
      ],
      NOW,
    );

    expect(checkFlightStatus).toHaveBeenCalledTimes(2);
    expect(notifications.show).not.toHaveBeenCalled();
  });
});
