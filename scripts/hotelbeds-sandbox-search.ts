import { HotelbedsSandboxClient } from "../src/lib/nova/providers/hotelbeds-sandbox";

function readCodes(): number[] {
  const configured = process.env["HOTELBEDS_TEST_HOTEL_CODES"]?.trim();
  if (!configured) {
    throw new Error(
      "Set HOTELBEDS_TEST_HOTEL_CODES to comma-separated Hotelbeds property codes before running the sandbox search.",
    );
  }
  const codes = configured.split(",").map((code) => Number(code.trim()));
  if (codes.some((code) => !Number.isSafeInteger(code) || code < 1)) {
    throw new Error(
      "HOTELBEDS_TEST_HOTEL_CODES must contain only positive numeric Hotelbeds codes.",
    );
  }
  return codes;
}

const checkIn = process.env["HOTELBEDS_SANDBOX_CHECK_IN"];
const checkOut = process.env["HOTELBEDS_SANDBOX_CHECK_OUT"];
let client: HotelbedsSandboxClient | undefined;

try {
  client = new HotelbedsSandboxClient();
  if (!checkIn || !checkOut) {
    throw new Error(
      "Set HOTELBEDS_SANDBOX_CHECK_IN and HOTELBEDS_SANDBOX_CHECK_OUT in YYYY-MM-DD format.",
    );
  }
  const hotels = await client.searchAvailability({
    checkIn,
    checkOut,
    hotelCodes: readCodes(),
    occupancies: [{ adults: 2 }],
  });

  const offers = hotels.flatMap((hotel) =>
    hotel.rooms.flatMap((room) =>
      room.rates.map((rate) => ({
        hotel: hotel.name,
        hotelCode: hotel.code,
        destination: hotel.destinationName ?? hotel.destinationCode ?? "",
        room: room.name ?? room.code ?? "Room",
        rateType: rate.rateType,
        amount: rate.sellingRate ?? rate.net ?? null,
        currency: hotel.currency ?? "",
        paymentType: rate.paymentType ?? "unspecified",
        cancellation:
          rate.cancellationPolicies?.map((policy) => ({
            amount: policy.amount,
            from: policy.from,
          })) ?? [],
        sandbox: true,
      })),
    ),
  );

  console.log(
    JSON.stringify(
      { environment: "HOTELBEDS_TEST_SANDBOX", resultCount: offers.length, offers },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Hotelbeds sandbox search failed.");
  process.exitCode = 1;
} finally {
  client?.close();
}
