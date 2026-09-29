/**
 * NOVA Travel Agent â€” Core AI Agent
 *
 * NOVA processes user messages through a pipeline:
 * 1. Intent Detection â†’ understand what the user wants
 * 2. Mode Selection â†’ General AI or Travel Agent
 * 3. Tool Selection â†’ which tools are needed
 * 4. Tool Execution â†’ run tools in parallel where possible
 * 5. Result Validation â†’ ensure no hallucinated results
 * 6. Answer Generation â†’ compose the final response
 *
 * Architecture is modular â€” providers can be swapped without changing agent logic.
 */

import { GoogleGenAI } from "@google/genai";
import type { AgentRequest, AgentResponse, IntentType, TripContext, MessageContent, ToolCall, Source, JsonValue } from "./types";
import { getWebSearchProvider } from "./providers/web-search";
import {
  GeminiHotelProvider,
  GeminiFlightProvider,
  GeminiActivityProvider,
  GeminiRestaurantProvider,
  GeminiDestinationProvider,
} from "./providers/travel";

const MODEL = "gemini-2.5-flash";
const ITINERARY_MODEL = "gemini-2.5-pro";  // Use Pro for complex planning tasks

function getAI(): GoogleGenAI {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  return new GoogleGenAI({ apiKey });
}

// â”€â”€â”€ System Prompts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const NOVA_PERSONALITY = `You are NOVA, an intelligent AI assistant for TUNITRAVEL â€” a premium travel agency.

Your personality:
- Intelligent, friendly, professional, calm, and genuinely helpful
- Conversational and natural â€” never robotic or overly formal
- Proactive: anticipate what the user needs next
- Concise for simple questions; detailed for complex research
- Multilingual: respond naturally in the user's language (English, French, Arabic, Italian, Tunisian dialect â€” respond in kind)

CRITICAL RULES:
- NEVER claim to have searched the web unless a web search actually happened
- NEVER invent hotel names, prices, flight numbers, or booking confirmations
- NEVER say "Your booking is confirmed" unless a real API returned a confirmation
- When you don't know something, say so clearly
- Distinguish between: VERIFIED (from live sources), ESTIMATED (typical ranges), and AI-GENERATED RECOMMENDATION
- Show source links when you have them

For travel questions in TRAVEL mode, you have access to live web research tools.
For general questions in GENERAL mode, answer from knowledge â€” use web search when current info is needed.`;

const GENERAL_MODE_PROMPT = `${NOVA_PERSONALITY}

MODE: GENERAL AI
You can help with any topic: technology, science, writing, languages, education, business, programming, travel, and everyday questions.
Be a capable, knowledgeable assistant. Don't force travel framing for non-travel questions.
Use web search when the user needs current information.`;

const TRAVEL_MODE_PROMPT = `${NOVA_PERSONALITY}

MODE: TRAVEL AGENT
You are operating as an expert travel consultant with access to live web research.

Your travel expertise includes:
- Destination research and recommendations
- Hotel search and comparison
- Flight search and route planning  
- Activity and attraction discovery
- Restaurant recommendations
- Itinerary building and optimization
- Budget calculation and comparison
- Booking workflow management

When helping with travel:
1. Extract trip context from the conversation (destination, dates, travelers, budget, preferences)
2. Use research tools to find current, accurate information
3. Present results in structured format with clear sourcing
4. Ask only for missing information needed for the next useful action
5. Remember context throughout the conversation â€” don't re-ask what user already told you
6. Be proactive: if they say "I'm going to Rome next month", you already know destination and timing`;

// â”€â”€â”€ Intent Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function detectIntent(
  message: string,
  history: AgentRequest["history"],
  currentContext: TripContext
): Promise<{ intent: IntentType; mode: "general" | "travel"; extractedContext: Partial<TripContext> }> {
  const ai = getAI();

  const contextSummary = JSON.stringify(currentContext, null, 2);
  const recentHistory = history.slice(-4).map(h => `${h.role}: ${h.text}`).join("\n");

  const prompt = `Analyze this user message and determine intent.

Current trip context: ${contextSummary}
Recent conversation:
${recentHistory}
New message: "${message}"

Return JSON with:
{
  "intent": one of [GENERAL_QUERY, GENERAL_CONVERSATION, TRAVEL_RESEARCH, TRIP_PLANNING, HOTEL_SEARCH, FLIGHT_SEARCH, RESTAURANT_SEARCH, ACTIVITY_SEARCH, DESTINATION_RESEARCH, BOOKING_REQUEST, BOOKING_CONFIRMATION, TRIP_MODIFICATION, ITINERARY_BUILD, BUDGET_CALCULATION],
  "mode": "general" or "travel",
  "extractedContext": {
    only include fields explicitly mentioned or strongly implied:
    "destination": string or null,
    "origin": string or null,
    "departureDate": "YYYY-MM-DD or relative like next month" or null,
    "returnDate": "YYYY-MM-DD" or null,
    "durationDays": number or null,
    "travelers": number or null,
    "adults": number or null,
    "children": number or null,
    "budget": number or null,
    "currency": string or null,
    "accommodationPreference": string or null,
    "interests": string[] or null,
    "tripStyle": string or null
  }
}

Return ONLY valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1, responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(response.text ?? "{}");
    return {
      intent: parsed.intent ?? "GENERAL_QUERY",
      mode: parsed.mode ?? "general",
      extractedContext: parsed.extractedContext ?? {},
    };
  } catch {
    return { intent: "GENERAL_QUERY", mode: "general", extractedContext: {} };
  }
}

// â”€â”€â”€ Context Merger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function mergeContext(
  existing: TripContext,
  extracted: Partial<TripContext>
): TripContext {
  const merged: TripContext = { ...existing };

  for (const [key, value] of Object.entries(extracted)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    const k = key as keyof TripContext;

    if (Array.isArray(value)) {
      const existing_arr = merged[k] as string[] | undefined;
      const merged_arr = [...new Set([...(existing_arr ?? []), ...value])];
      (merged as Record<string, unknown>)[k] = merged_arr;
    } else {
      (merged as Record<string, unknown>)[k] = value;
    }
  }

  return merged;
}

// â”€â”€â”€ Tool Execution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function executeHotelSearch(context: TripContext): Promise<{ content: Partial<MessageContent>; toolCall: ToolCall }> {
  const id = `tool-hotels-${Date.now()}`;
  const toolCall: ToolCall = {
    id,
    name: "search_hotels",
    label: `Searching hotels in ${context.destination ?? "destination"}â€¦`,
    status: "running",
    startedAt: Date.now(),
  };

  try {
    const provider = new GeminiHotelProvider();
    const hotels = await provider.search({
      destination: context.destination ?? "",
      checkIn: context.departureDate ?? "TBD",
      checkOut: context.returnDate ?? "TBD",
      adults: context.adults ?? context.travelers ?? 2,
      ...(context.children !== undefined ? { children: context.children } : {}),
      ...(context.budget ? { budgetPerNight: Math.round(context.budget / (context.durationDays ?? 5)) } : {}),
      ...(context.currency !== undefined ? { currency: context.currency } : {}),
      ...(context.accommodationPreference !== undefined ? { category: context.accommodationPreference } : {}),
      maxResults: 5,
    });

    toolCall.status = "done";
    toolCall.endedAt = Date.now();
    toolCall.result = hotels as unknown as JsonValue;

    return {
      content: { hotels },
      toolCall,
    };
  } catch (error) {
    toolCall.status = "error";
    toolCall.error = error instanceof Error ? error.message : "Search failed";
    toolCall.endedAt = Date.now();
    return { content: {}, toolCall };
  }
}

async function executeFlightSearch(context: TripContext): Promise<{ content: Partial<MessageContent>; toolCall: ToolCall }> {
  const id = `tool-flights-${Date.now()}`;
  const toolCall: ToolCall = {
    id,
    name: "search_flights",
    label: `Searching flights from ${context.origin ?? "origin"} to ${context.destination ?? "destination"}â€¦`,
    status: "running",
    startedAt: Date.now(),
  };

  try {
    const provider = new GeminiFlightProvider();
    const flights = await provider.search({
      origin: context.origin ?? "",
      destination: context.destination ?? "",
      departureDate: context.departureDate ?? "TBD",
      ...(context.returnDate !== undefined ? { returnDate: context.returnDate } : {}),
      adults: context.adults ?? context.travelers ?? 1,
      ...(context.children !== undefined ? { children: context.children } : {}),
      maxResults: 5,
    });

    toolCall.status = "done";
    toolCall.endedAt = Date.now();
    toolCall.result = flights as unknown as JsonValue;

    return { content: { flights }, toolCall };
  } catch (error) {
    toolCall.status = "error";
    toolCall.error = error instanceof Error ? error.message : "Search failed";
    toolCall.endedAt = Date.now();
    return { content: {}, toolCall };
  }
}

async function executeActivitySearch(context: TripContext): Promise<{ content: Partial<MessageContent>; toolCall: ToolCall }> {
  const id = `tool-activities-${Date.now()}`;
  const toolCall: ToolCall = {
    id,
    name: "search_activities",
    label: `Finding activities in ${context.destination ?? "destination"}â€¦`,
    status: "running",
    startedAt: Date.now(),
  };

  try {
    const provider = new GeminiActivityProvider();
    const activities = await provider.search({
      destination: context.destination ?? "",
      ...(context.interests !== undefined ? { interests: context.interests } : {}),
      ...(context.budget !== undefined ? { budget: context.budget } : {}),
      ...(context.currency !== undefined ? { currency: context.currency } : {}),
      maxResults: 6,
    });

    toolCall.status = "done";
    toolCall.endedAt = Date.now();
    toolCall.result = activities as unknown as JsonValue;

    return { content: { activities }, toolCall };
  } catch (error) {
    toolCall.status = "error";
    toolCall.error = error instanceof Error ? error.message : "Search failed";
    toolCall.endedAt = Date.now();
    return { content: {}, toolCall };
  }
}

async function executeRestaurantSearch(context: TripContext): Promise<{ content: Partial<MessageContent>; toolCall: ToolCall }> {
  const id = `tool-restaurants-${Date.now()}`;
  const toolCall: ToolCall = {
    id,
    name: "search_restaurants",
    label: `Finding restaurants in ${context.destination ?? "destination"}â€¦`,
    status: "running",
    startedAt: Date.now(),
  };

  try {
    const provider = new GeminiRestaurantProvider();
    const cuisine = context.dietaryPreferences?.join(", ");
    const restaurants = await provider.search({
      destination: context.destination ?? "",
      ...(cuisine !== undefined ? { cuisine } : {}),
      maxResults: 6,
    });

    toolCall.status = "done";
    toolCall.endedAt = Date.now();
    toolCall.result = restaurants as unknown as JsonValue;

    return { content: { restaurants }, toolCall };
  } catch (error) {
    toolCall.status = "error";
    toolCall.error = error instanceof Error ? error.message : "Search failed";
    toolCall.endedAt = Date.now();
    return { content: {}, toolCall };
  }
}

async function executeDestinationSearch(query: string, context: TripContext): Promise<{ content: Partial<MessageContent>; toolCall: ToolCall }> {
  const id = `tool-destinations-${Date.now()}`;
  const toolCall: ToolCall = {
    id,
    name: "search_destinations",
    label: "Researching destinationsâ€¦",
    status: "running",
    startedAt: Date.now(),
  };

  try {
    const provider = new GeminiDestinationProvider();
    const contextSummary = [
      context.budget ? `budget ~${context.budget} ${context.currency ?? ""}` : null,
      context.interests?.length ? `interests: ${context.interests.join(", ")}` : null,
      context.tripStyle ? `style: ${context.tripStyle}` : null,
      context.durationDays ? `${context.durationDays} days` : null,
    ].filter(Boolean).join(", ");

    const destinations = await provider.search(query, contextSummary);

    toolCall.status = "done";
    toolCall.endedAt = Date.now();
    toolCall.result = destinations as unknown as JsonValue;

    return { content: { destinations }, toolCall };
  } catch (error) {
    toolCall.status = "error";
    toolCall.error = error instanceof Error ? error.message : "Search failed";
    toolCall.endedAt = Date.now();
    return { content: {}, toolCall };
  }
}

async function executeWebSearch(query: string, label: string): Promise<{ sources: Source[]; toolCall: ToolCall }> {
  const id = `tool-search-${Date.now()}`;
  const toolCall: ToolCall = {
    id,
    name: "search_web",
    label,
    status: "running",
    startedAt: Date.now(),
  };

  try {
    const provider = getWebSearchProvider();
    const results = await provider.search(query, 6);

    const sources: Source[] = results.map((r) => ({
      title: r.title,
      url: r.url,
      type: r.source.includes("official") || r.source.includes("gov")
        ? "official"
        : r.source.includes("booking") || r.source.includes("hotel") || r.source.includes("expedia")
          ? "booking"
          : "review",
    }));

    toolCall.status = "done";
    toolCall.endedAt = Date.now();
    toolCall.result = sources as unknown as JsonValue;

    return { sources, toolCall };
  } catch (error) {
    toolCall.status = "error";
    toolCall.error = error instanceof Error ? error.message : "Search failed";
    toolCall.endedAt = Date.now();
    return { sources: [], toolCall };
  }
}

// â”€â”€â”€ Response Generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function generateTextResponse(
  message: string,
  history: AgentRequest["history"],
  context: TripContext,
  mode: "general" | "travel",
  toolResults: string,
  intent: IntentType
): Promise<string> {
  const ai = getAI();

  const systemPrompt = mode === "general" ? GENERAL_MODE_PROMPT : TRAVEL_MODE_PROMPT;

  const contextInfo = mode === "travel" && Object.keys(context).length > 0
    ? `\n\nCurrent trip context: ${JSON.stringify(context, null, 2)}`
    : "";

  const toolInfo = toolResults
    ? `\n\nResearch results from tools:\n${toolResults}\n\nUse these results to answer. Reference them naturally.`
    : "";

  const intentInfo = `\nUser intent: ${intent}`;

  const historyContents = history.slice(-8).map(h => ({
    role: h.role as "user" | "model",
    parts: [{ text: h.text }],
  }));

  const userMessage = message + contextInfo + toolInfo + intentInfo;

  const useProModel = intent === "ITINERARY_BUILD" || intent === "TRIP_PLANNING";

  const response = await ai.models.generateContent({
    model: useProModel ? ITINERARY_MODEL : MODEL,
    contents: [
      ...historyContents,
      { role: "user", parts: [{ text: userMessage }] },
    ],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });

  return response.text ?? "I'm sorry, I couldn't generate a response. Please try again.";
}

// â”€â”€â”€ Follow-Up Suggestions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function generateFollowUps(
  intent: IntentType,
  context: TripContext,
  responseText: string
): Promise<string[]> {
  const ai = getAI();

  const prompt = `Based on this travel assistant response about "${intent}" for a trip to ${context.destination ?? "a destination"}, suggest 3 natural follow-up questions the user might ask.

Response summary: ${responseText.slice(0, 300)}

Return a JSON array of 3 short follow-up question strings. Make them specific to what was just discussed.
Return ONLY valid JSON array of strings.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.8, responseMimeType: "application/json" },
    });

    const suggestions = JSON.parse(response.text ?? "[]") as string[];
    return suggestions.slice(0, 3);
  } catch {
    return [];
  }
}

// â”€â”€â”€ Main Agent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function runNovaAgent(request: AgentRequest): Promise<AgentResponse> {
  const { message, history, tripContext, mode } = request;

  console.log(`[NOVA] Processing: "${message.slice(0, 80)}" | mode=${mode}`);

  // 1. Detect intent and extract context
  const { intent, extractedContext } = await detectIntent(message, history, tripContext);
  const updatedContext = mergeContext(tripContext, extractedContext);

  console.log(`[NOVA] Intent: ${intent} | Context:`, JSON.stringify(updatedContext));

  const toolCalls: ToolCall[] = [];
  let combinedContent: Partial<MessageContent> = {};
  let toolResultsText = "";
  const allSources: Source[] = [];

  // 2. Execute tools based on intent
  try {
    if (intent === "HOTEL_SEARCH" && updatedContext.destination) {
      const { content, toolCall } = await executeHotelSearch(updatedContext);
      toolCalls.push(toolCall);
      combinedContent = { ...combinedContent, ...content };
      toolResultsText += `Hotels found: ${JSON.stringify(content.hotels?.slice(0, 3), null, 2)}`;
    }

    if (intent === "FLIGHT_SEARCH" && updatedContext.origin && updatedContext.destination) {
      const { content, toolCall } = await executeFlightSearch(updatedContext);
      toolCalls.push(toolCall);
      combinedContent = { ...combinedContent, ...content };
      toolResultsText += `Flights found: ${JSON.stringify(content.flights?.slice(0, 3), null, 2)}`;
    }

    if (intent === "ACTIVITY_SEARCH" && updatedContext.destination) {
      const { content, toolCall } = await executeActivitySearch(updatedContext);
      toolCalls.push(toolCall);
      combinedContent = { ...combinedContent, ...content };
      toolResultsText += `Activities found: ${JSON.stringify(content.activities?.slice(0, 3), null, 2)}`;
    }

    if (intent === "RESTAURANT_SEARCH" && updatedContext.destination) {
      const { content, toolCall } = await executeRestaurantSearch(updatedContext);
      toolCalls.push(toolCall);
      combinedContent = { ...combinedContent, ...content };
      toolResultsText += `Restaurants found: ${JSON.stringify(content.restaurants?.slice(0, 3), null, 2)}`;
    }

    if (intent === "DESTINATION_RESEARCH" || intent === "TRIP_PLANNING") {
      const { content, toolCall } = await executeDestinationSearch(message, updatedContext);
      toolCalls.push(toolCall);
      combinedContent = { ...combinedContent, ...content };
      toolResultsText += `Destinations: ${JSON.stringify(content.destinations?.slice(0, 3), null, 2)}`;
    }

    // Web search for travel research, general queries needing current info
    if (
      intent === "TRAVEL_RESEARCH" ||
      (intent === "GENERAL_QUERY" && /current|today|latest|now|2024|2025|2026/i.test(message))
    ) {
      const searchQuery = mode === "travel" && updatedContext.destination
        ? `${message} ${updatedContext.destination}`
        : message;

      const { sources, toolCall } = await executeWebSearch(
        searchQuery,
        `Researching: ${searchQuery.slice(0, 50)}â€¦`
      );
      toolCalls.push(toolCall);
      allSources.push(...sources);
      if (sources.length > 0) {
        toolResultsText += `\nWeb sources found: ${sources.map(s => s.title).join(", ")}`;
      }
    }

    // For itinerary building, also search for activities
    if (intent === "ITINERARY_BUILD" && updatedContext.destination) {
      const [actRes] = await Promise.allSettled([
        executeActivitySearch(updatedContext),
      ]);
      if (actRes.status === "fulfilled") {
        const { content, toolCall } = actRes.value;
        toolCalls.push(toolCall);
        combinedContent = { ...combinedContent, ...content };
        toolResultsText += `Activities for itinerary: ${JSON.stringify(content.activities?.slice(0, 5), null, 2)}`;
      }
    }
  } catch (error) {
    console.error("[NOVA] Tool execution error:", error);
    toolCalls.push({
      id: `tool-error-${Date.now()}`,
      name: "tool_error",
      label: "Tool execution failed",
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      startedAt: Date.now(),
      endedAt: Date.now(),
    });
  }

  // 3. Generate text response
  const responseText = await generateTextResponse(
    message,
    history,
    updatedContext,
    mode,
    toolResultsText,
    intent
  );

  // 4. Generate follow-up suggestions
  const suggestedFollowUps = await generateFollowUps(intent, updatedContext, responseText);

  // 5. Build final content
  const finalContent: MessageContent = {
    type: "text",
    text: responseText,
    ...(allSources.length > 0 ? { sources: allSources } : {}),
    ...combinedContent,
  };

  // Determine the most specific content type
  if (combinedContent.hotels?.length) finalContent.type = "hotel_results";
  else if (combinedContent.flights?.length) finalContent.type = "flight_results";
  else if (combinedContent.activities?.length) finalContent.type = "activity_results";
  else if (combinedContent.restaurants?.length) finalContent.type = "restaurant_results";
  else if (combinedContent.destinations?.length) finalContent.type = "destination_results";

  console.log(`[NOVA] Response generated | type=${finalContent.type} | toolCalls=${toolCalls.length}`);

  return {
    content: finalContent,
    toolCalls,
    updatedTripContext: updatedContext,
    suggestedFollowUps,
  };
}
