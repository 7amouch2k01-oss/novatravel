/**
 * Hotelbeds evaluation-environment client.
 *
 * This module is deliberately not registered with NOVA's customer-facing
 * providers. Every Booking API operation must use Hotelbeds mTLS credentials.
 * Keep rate keys and provider responses server-side; never send them to Gemini
 * or the browser.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Agent, request as httpsRequest } from "node:https";
import { z } from "zod";

const HOTELBEDS_TEST_ORIGIN = "https://api-mtls.test.hotelbeds.com";
const HOTEL_CODE = z.union([z.string(), z.number()]);
const MONEY = z.union([z.string(), z.number()]);

const CancellationPolicySchema = z
  .object({
    amount: MONEY.optional(),
    from: z.string().optional(),
  })
  .passthrough();

const RateSchema = z
  .object({
    rateKey: z.string().min(1),
    rateType: z.enum(["BOOKABLE", "RECHECK"]),
    net: MONEY.optional(),
    sellingRate: MONEY.optional(),
    paymentType: z.string().optional(),
    boardName: z.string().optional(),
    cancellationPolicies: z.array(CancellationPolicySchema).optional(),
  })
  .passthrough();

const RoomSchema = z
  .object({
    code: z.string().optional(),
    name: z.string().optional(),
    rates: z.array(RateSchema).default([]),
  })
  .passthrough();

const AvailabilitySchema = z
  .object({
    hotels: z
      .object({
        hotels: z.array(
          z
            .object({
              code: HOTEL_CODE,
              name: z.string(),
              categoryCode: z.string().optional(),
              destinationCode: z.string().optional(),
              destinationName: z.string().optional(),
              zoneName: z.string().optional(),
              currency: z.string().optional(),
              rooms: z.array(RoomSchema).default([]),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
  })
  .passthrough();

const BookingRecordSchema = z
  .object({
    reference: z.string().min(1),
    status: z.string().optional(),
  })
  .passthrough();
const BookingResponseSchema = z
  .object({
    booking: BookingRecordSchema.optional(),
    bookings: z.array(BookingRecordSchema).optional(),
  })
  .passthrough();
export type HotelbedsRate = z.infer<typeof RateSchema>;
export type HotelbedsAvailableHotel = z.infer<
  typeof AvailabilitySchema
>["hotels"]["hotels"][number];
export interface HotelbedsOccupancy {
  adults: number;
  children?: number;
  childrenAges?: number[];
}
export interface HotelbedsSandboxSearch {
  checkIn: string;
  checkOut: string;
  hotelCodes: Array<string | number>;
  occupancies: HotelbedsOccupancy[];
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function safeApiError(statusCode: number, body: string, secrets: string[]): Error {
  let diagnostic = "";
  try {
    const payload = JSON.parse(body) as Record<string, unknown>;
    const candidates: unknown[] = [
      payload["code"],
      payload["errorCode"],
      payload["error"],
      payload["message"],
      payload["description"],
    ];
    const errors = payload["errors"];
    if (Array.isArray(errors)) {
      for (const item of errors) {
        if (item && typeof item === "object") {
          const entry = item as Record<string, unknown>;
          candidates.push(entry["code"], entry["errorCode"], entry["message"]);
        }
      }
    }
    const safe = candidates
      .filter((value): value is string => typeof value === "string")
      .map((value) => {
        let result = value.slice(0, 240);
        for (const secret of secrets) {
          if (secret) result = result.replaceAll(secret, "[redacted]");
        }
        return result
          .replace(/\b\d{8}\|\d{8}\|[^\s"'`,}]+/g, "[rate key redacted]")
          .replace(/\b[a-f\d]{32,}\b/gi, "[token redacted]")
          .replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/gi, "[email redacted]");
      })
      .filter(Boolean);
    diagnostic = [...new Set(safe)].join(": ");
  } catch {
    // Provider error bodies are optional and must never be emitted raw.
  }
  const suffix = diagnostic ? ` — ${diagnostic}` : "";
  if (statusCode === 401 || statusCode === 403) {
    return new Error(
      `Hotelbeds rejected the sandbox request (HTTP ${statusCode}). Check the test API key and certificate association.${suffix}`,
    );
  }
  return new Error(`Hotelbeds sandbox request failed (HTTP ${statusCode})${suffix}.`);
}

/**
 * Test-only Hotelbeds client. The production host is intentionally not
 * configurable here so evaluation credentials cannot accidentally book live.
 */
export class HotelbedsSandboxClient {
  readonly environment = "test" as const;
  private readonly apiKey: string;
  private readonly secret: string;
  private readonly agent: Agent;

  constructor() {
    if (process.env["HOTELBEDS_ENV"] !== "test") {
      throw new Error(
        'Set HOTELBEDS_ENV="test" to use the sandbox client. Production is not supported here.',
      );
    }
    this.apiKey = requiredEnv("HOTELBEDS_API_KEY");
    this.secret = requiredEnv("HOTELBEDS_API_SECRET");

    const certPath = requiredEnv("HOTELBEDS_MTLS_CERT_PATH");
    const keyPath = requiredEnv("HOTELBEDS_MTLS_KEY_PATH");
    try {
      this.agent = new Agent({
        keepAlive: true,
        cert: readFileSync(certPath),
        key: readFileSync(keyPath),
      });
    } catch {
      throw new Error(
        "Hotelbeds mTLS certificate files could not be read. Check the configured file paths.",
      );
    }
  }

  async searchAvailability(params: HotelbedsSandboxSearch): Promise<HotelbedsAvailableHotel[]> {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(params.checkIn) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(params.checkOut)
    ) {
      throw new Error("Hotelbeds dates must use YYYY-MM-DD format.");
    }
    if (params.checkOut <= params.checkIn) throw new Error("Check-out must be after check-in.");
    if (
      params.hotelCodes.length < 1 ||
      params.hotelCodes.length > 100 ||
      params.hotelCodes.some((code) => !Number.isSafeInteger(Number(code)) || Number(code) < 1)
    ) {
      throw new Error("Provide between 1 and 100 positive numeric Hotelbeds hotel codes.");
    }
    if (params.occupancies.length < 1 || params.occupancies.length > 20) {
      throw new Error("Provide between 1 and 20 room occupancies.");
    }

    const response = await this.post("/hotel-api/1.0/hotels", {
      stay: { checkIn: params.checkIn, checkOut: params.checkOut },
      occupancies: params.occupancies.map((occupancy) => ({
        rooms: 1,
        adults: occupancy.adults,
        children: occupancy.children ?? 0,
        ...(occupancy.childrenAges?.length
          ? { paxes: occupancy.childrenAges.map((age) => ({ type: "CH", age })) }
          : {}),
      })),
      hotels: { hotel: params.hotelCodes.map((code) => Number(code)) },
    });
    const parsed = AvailabilitySchema.safeParse(response);
    if (!parsed.success) throw new Error("Hotelbeds returned an unexpected availability response.");
    return parsed.data.hotels.hotels;
  }

  async recheckRate(rateKey: string): Promise<HotelbedsAvailableHotel[]> {
    if (!rateKey.trim()) throw new Error("A Hotelbeds rate key is required.");
    const response = await this.post("/hotel-api/1.0/checkrates", {
      rooms: [{ rateKey }],
    });
    const parsed = AvailabilitySchema.safeParse(response);
    if (!parsed.success) throw new Error("Hotelbeds returned an unexpected check-rate response.");
    return parsed.data.hotels.hotels;
  }

  async createTestBooking(rateKey: string): Promise<{ reference: string; status: string }> {
    if (!rateKey.trim() || rateKey.length > 4096)
      throw new Error("A valid Hotelbeds test rate key is required.");
    const response = await this.post("/hotel-api/1.0/bookings", {
      holder: { name: "Booking", surname: "Test" },
      rooms: [
        {
          rateKey,
          paxes: [
            { roomId: 1, type: "AD", name: "First Adult Name", surname: "Surname" },
            { roomId: 1, type: "AD", name: "Second Adult Name", surname: "Surname" },
          ],
        },
      ],
      clientReference: `NOVA-SBX-${Date.now().toString().slice(-8)}`,
      remark: "Automated sandbox booking and cancellation test.",
      tolerance: 2,
    });
    return readBookingSummary(response, "booking");
  }

  async cancelTestBooking(reference: string): Promise<{ reference: string; status: string }> {
    if (!/^[A-Za-z0-9-]{3,40}$/.test(reference)) {
      throw new Error("A valid Hotelbeds test booking reference is required.");
    }
    const response = await this.delete(
      `/hotel-api/1.0/bookings/${encodeURIComponent(reference)}?cancellationFlag=CANCELLATION&language=ENG`,
    );
    return readBookingSummary(response, "cancellation");
  }
  close(): void {
    this.agent.destroy();
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    return this.request("POST", path, body);
  }

  private async delete(path: string): Promise<unknown> {
    return this.request("DELETE", path);
  }

  private async request(method: "POST" | "DELETE", path: string, body?: unknown): Promise<unknown> {
    const signature = createSignature(this.apiKey, this.secret);
    const url = new URL(path, HOTELBEDS_TEST_ORIGIN);
    const payload = body === undefined ? undefined : JSON.stringify(body);

    return new Promise((resolve, reject) => {
      const req = httpsRequest(
        url,
        {
          method,
          agent: this.agent,
          headers: {
            "Api-key": this.apiKey,
            "X-Signature": signature,
            Accept: "application/json",
            ...(payload === undefined
              ? {}
              : {
                  "Content-Type": "application/json",
                  "Content-Length": Buffer.byteLength(payload),
                }),
          },
          timeout: 20_000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > 5_000_000) {
              req.destroy(new Error("Hotelbeds response exceeded the 5 MB safety limit."));
              return;
            }
            chunks.push(chunk);
          });
          res.on("end", () => {
            const statusCode = res.statusCode ?? 0;
            if (statusCode < 200 || statusCode >= 300) {
              reject(
                safeApiError(statusCode, Buffer.concat(chunks).toString("utf8"), [
                  this.apiKey,
                  this.secret,
                ]),
              );
              return;
            }
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown);
            } catch {
              reject(new Error("Hotelbeds returned an invalid JSON response."));
            }
          });
        },
      );
      req.on("timeout", () => req.destroy(new Error("Hotelbeds sandbox request timed out.")));
      req.on("error", (error: NodeJS.ErrnoException) => {
        const code = error.code;
        reject(
          new Error(
            code === "ECONNRESET"
              ? "Hotelbeds sandbox connection was reset."
              : "Could not connect to Hotelbeds sandbox.",
          ),
        );
      });
      req.end(payload);
    });
  }
}

function readBookingSummary(
  response: unknown,
  operation: "booking" | "cancellation",
): { reference: string; status: string } {
  const parsed = BookingResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error(`Hotelbeds returned an unexpected ${operation} response.`);
  }
  const booking = parsed.data.booking ?? parsed.data.bookings?.[0];
  if (!booking?.reference) throw new Error(`Hotelbeds ${operation} response has no reference.`);
  return { reference: booking.reference, status: booking.status ?? "UNKNOWN" };
}

function createSignature(apiKey: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return createHash("sha256").update(`${apiKey}${secret}${timestamp}`).digest("hex");
}
