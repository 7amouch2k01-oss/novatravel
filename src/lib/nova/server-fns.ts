/**
 * NOVA Travel Agent — Server Functions
 *
 * These are TanStack Start server functions. They run ONLY on the server.
 * The GEMINI_API_KEY is NEVER exposed to the browser.
 *
 * All AI logic, tool calls, and external API requests go through here.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runNovaAgent } from "@/lib/nova/agent";
import type { AgentRequest, AgentResponse } from "@/lib/nova/types";

// ─── Schema Validation ────────────────────────────────────────────────────────

const TripContextSchema = z.object({
  destination: z.string().optional(),
  origin: z.string().optional(),
  departureDate: z.string().optional(),
  returnDate: z.string().optional(),
  durationDays: z.number().optional(),
  travelers: z.number().optional(),
  adults: z.number().optional(),
  children: z.number().optional(),
  budget: z.number().optional(),
  currency: z.string().optional(),
  accommodationPreference: z.string().optional(),
  transportationPreference: z.string().optional(),
  interests: z.array(z.string()).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  accessibilityNeeds: z.array(z.string()).optional(),
  preferredActivities: z.array(z.string()).optional(),
  tripStyle: z.string().optional(),
  hotelName: z.string().optional(),
  flightId: z.string().optional(),
  stops: z.array(z.string()).optional(),
  confirmedDaysPlan: z.array(z.any()).optional(),
  isPlanConfirmed: z.boolean().optional(),
});

const HistoryItemSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string(),
});

const DocumentAttachmentSchema = z.object({
  name: z.string().max(255),
  mimeType: z.string().max(100),
  base64: z.string(),
  sizeBytes: z.number(),
});

const ChatRequestSchema = z.object({
  message: z.string(),
  history: z.array(HistoryItemSchema).max(25),
  tripContext: TripContextSchema,
  mode: z.enum(["general", "travel"]),
  attachment: DocumentAttachmentSchema.optional(),
});

// ─── Chat Server Function ─────────────────────────────────────────────────────

export const sendMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) => ChatRequestSchema.parse(data))
  .handler(async ({ data }): Promise<AgentResponse> => {
    // Validate API key presence server-side
    if (!process.env["GEMINI_API_KEY"]) {
      throw new Error(
        "NOVA is not configured. Please add GEMINI_API_KEY to your environment variables."
      );
    }

    const request: AgentRequest = {
      message: data.message,
      history: data.history,
      tripContext: data.tripContext,
      mode: data.mode,
      ...(data.attachment ? { attachment: data.attachment } : {}),
    };

    const startTime = Date.now();

    try {
      const response = await runNovaAgent(request);
      console.log(`[ServerFn] Chat completed in ${Date.now() - startTime}ms`);
      return response;
    } catch (error) {
      console.error("[ServerFn] Agent error:", error);

      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

      // Return graceful error response — never throw to client
      return {
        content: {
          type: "error",
          text: errorMessage.includes("GEMINI_API_KEY")
            ? "NOVA requires a Gemini API key to function. Please add GEMINI_API_KEY to your .env file and restart the server."
            : `I ran into an issue: ${errorMessage}. Please try again.`,
        },
        toolCalls: [],
        updatedTripContext: data.tripContext,
        suggestedFollowUps: [],
      };
    }
  });

// ─── Health Check ─────────────────────────────────────────────────────────────

export const checkApiStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const hasKey = !!process.env["GEMINI_API_KEY"];
    return {
      configured: hasKey,
      message: hasKey
        ? "NOVA is ready."
        : "Add GEMINI_API_KEY to .env to enable NOVA.",
    };
  }
);
