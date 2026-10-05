import {
  HotelbedsSandboxClient,
  type HotelbedsRate,
} from "../src/lib/nova/providers/hotelbeds-sandbox";

function readCodes(): number[] {
  const configured = process.env["HOTELBEDS_TEST_HOTEL_CODES"]?.trim();
  if (!configured)
    throw new Error("Configure HOTELBEDS_TEST_HOTEL_CODES before running the sandbox test.");
  const codes = configured.split(",").map((code) => Number(code.trim()));
  if (codes.some((code) => !Number.isSafeInteger(code) || code < 1)) {
    throw new Error("HOTELBEDS_TEST_HOTEL_CODES must contain only positive numeric hotel codes.");
  }
  return codes;
}

const checkIn = process.env["HOTELBEDS_SANDBOX_CHECK_IN"];
const checkOut = process.env["HOTELBEDS_SANDBOX_CHECK_OUT"];
let client: HotelbedsSandboxClient | undefined;
let createdReference: string | undefined;
let testBookingCancelled = false;

try {
  client = new HotelbedsSandboxClient();
  if (!checkIn || !checkOut)
    throw new Error("Configure sandbox check-in and check-out dates first.");

  const hotels = await client.searchAvailability({
    checkIn,
    checkOut,
    hotelCodes: readCodes(),
    occupancies: [{ adults: 2 }],
  });
  const rates = hotels.flatMap((hotel) =>
    hotel.rooms.flatMap((room) => room.rates.map((rate) => ({ hotel: hotel.name, rate }))),
  );

  let selected = rates.find(({ rate }) => rate.rateType === "BOOKABLE");
  if (!selected) {
    const recheck = rates.find(({ rate }) => rate.rateType === "RECHECK");
    if (recheck) {
      const refreshedHotels = await client.recheckRate(recheck.rate.rateKey);
      selected = refreshedHotels
        .flatMap((hotel) =>
          hotel.rooms.flatMap((room) => room.rates.map((rate) => ({ hotel: hotel.name, rate }))),
        )
        .find(({ rate }) => rate.rateType === "BOOKABLE");
    }
  }
  if (!selected)
    throw new Error("No bookable test rate was returned for the configured hotel codes and dates.");

  const booking = await client.createTestBooking(selected.rate.rateKey);
  createdReference = booking.reference;
  const bookingConfirmed = booking.status.toUpperCase() === "CONFIRMED";
  const cancellation = await client.cancelTestBooking(createdReference);
  if (cancellation.status.toUpperCase() !== "CANCELLED") {
    throw new Error(`Hotelbeds test cancellation status was ${cancellation.status}.`);
  }
  testBookingCancelled = true;
  if (!bookingConfirmed) {
    throw new Error(
      `Test booking status was ${booking.status} before it was successfully cancelled.`,
    );
  }

  console.log(
    JSON.stringify(
      {
        environment: "HOTELBEDS_TEST_SANDBOX",
        matchedHotels: hotels.length,
        bookingStatus: booking.status,
        cancellationStatus: cancellation.status,
        paymentType: selected.rate.paymentType ?? "unspecified",
        testBookingReference: booking.reference,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Hotelbeds sandbox booking test failed.");
  if (createdReference && !testBookingCancelled)
    console.error(`Test booking reference for follow-up: ${createdReference}`);
  process.exitCode = 1;
} finally {
  client?.close();
}
