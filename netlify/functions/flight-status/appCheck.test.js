import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const joseMocks = vi.hoisted(() => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(() => "jwks"),
}));

vi.mock("jose", () => joseMocks);

const { verifyAppCheckToken } = await import("./appCheck.js");

describe("verifyAppCheckToken", () => {
  const original = {
    number: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    id: process.env.VITE_FIREBASE_PROJECT_ID,
  };

  beforeEach(() => {
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = "123456789";
    process.env.VITE_FIREBASE_PROJECT_ID = "fly-log-test";
    joseMocks.jwtVerify.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = original.number;
    process.env.VITE_FIREBASE_PROJECT_ID = original.id;
    vi.restoreAllMocks();
  });

  it("accepts a token that verifies against Firebase's keys", async () => {
    joseMocks.jwtVerify.mockResolvedValue({ payload: { sub: "app-1" } });

    await expect(verifyAppCheckToken("a.b.c")).resolves.toEqual({ ok: true });
  });

  it("pins the algorithm, issuer and audience to this project", async () => {
    joseMocks.jwtVerify.mockResolvedValue({ payload: {} });

    await verifyAppCheckToken("a.b.c");

    expect(joseMocks.jwtVerify).toHaveBeenCalledWith(
      "a.b.c",
      expect.anything(),
      {
        algorithms: ["RS256"],
        issuer: "https://firebaseappcheck.googleapis.com/123456789",
        audience: ["projects/123456789", "projects/fly-log-test"],
      },
    );
  });

  it("rejects a missing token without calling out to jose", async () => {
    const result = await verifyAppCheckToken(undefined);

    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(joseMocks.jwtVerify).not.toHaveBeenCalled();
  });

  it("rejects a token that fails verification", async () => {
    joseMocks.jwtVerify.mockRejectedValue(
      Object.assign(new Error("signature verification failed"), {
        code: "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
      }),
    );

    const result = await verifyAppCheckToken("a.b.c");

    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("fails closed, not open, when the project is not configured", async () => {
    // An unset project id would otherwise leave the audience unconstrained and
    // accept a token minted for any Firebase project.
    delete process.env.VITE_FIREBASE_PROJECT_ID;

    const result = await verifyAppCheckToken("a.b.c");

    expect(result).toMatchObject({ ok: false, status: 500 });
    expect(joseMocks.jwtVerify).not.toHaveBeenCalled();
  });
});
