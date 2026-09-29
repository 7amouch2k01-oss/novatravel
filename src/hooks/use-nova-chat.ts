/**
 * NOVA Travel Agent — Client-side Chat Hook
 *
 * Manages conversation state, mode, trip context, and server communication.
 * No AI logic runs here — all AI happens in server functions.
 */

import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendMessage, checkApiStatus } from "@/lib/nova/server-fns";
import type { Message, TripContext, AgentMode, ToolCall, AgentResponse } from "@/lib/nova/types";
import { useQuery } from "@tanstack/react-query";

// ─── ID Generator ─────────────────────────────────────────────────────────────

function genId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Nova Status ──────────────────────────────────────────────────────────────

export function useNovaStatus() {
  return useQuery({
    queryKey: ["nova-status"],
    queryFn: () => checkApiStatus(),
    staleTime: 60_000,
    retry: false,
  });
}

// ─── Chat Hook ────────────────────────────────────────────────────────────────

interface UseChatOptions {
  initialMode?: AgentMode;
  initialContext?: TripContext;
}

export function useNovaChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<AgentMode>(options.initialMode ?? "travel");
  const [tripContext, setTripContext] = useState<TripContext>(
    options.initialContext ?? {}
  );
  const [liveToolCalls, setLiveToolCalls] = useState<ToolCall[]>([]);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Build history for the AI from messages (last 10 exchanges = 20 messages)
  const buildHistory = useCallback(
    (msgs: Message[]) => {
      return msgs
        .slice(-20)
        .map((m) => ({
          role: m.role === "user" ? "user" as const : "model" as const,
          text: m.content.text ?? "",
        }))
        .filter((h) => h.text.length > 0);
    },
    []
  );

  const mutation = useMutation({
    mutationFn: async (userText: string) => {
      // Add user message immediately
      const userMsg: Message = {
        id: genId(),
        role: "user",
        content: { type: "text", text: userText },
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      scrollToBottom();

      // Show thinking state
      setLiveToolCalls([{
        id: "thinking",
        name: "thinking",
        label: "NOVA is thinking…",
        status: "running",
        startedAt: Date.now(),
      }]);

      // Build history excluding the message we just added
      const history = buildHistory(messages);

      const response = await sendMessage({
        data: {
          message: userText,
          history,
          tripContext,
          mode,
        },
      }) as AgentResponse;

      return { response, userMsg };
    },

    onSuccess: ({ response }) => {
      // Update live tool calls to show completed state briefly
      setLiveToolCalls(response.toolCalls);

      // Add NOVA's response
      const novaMsg: Message = {
        id: genId(),
        role: "nova",
        content: response.content,
        toolCalls: response.toolCalls,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, novaMsg]);
      setTripContext(response.updatedTripContext);
      setSuggestedFollowUps(response.suggestedFollowUps ?? []);

      // Clear live tool calls after a delay
      setTimeout(() => setLiveToolCalls([]), 1500);
      scrollToBottom();
    },

    onError: (error) => {
      setLiveToolCalls([]);
      const errorMsg: Message = {
        id: genId(),
        role: "nova",
        content: {
          type: "error",
          text: `I ran into an issue: ${error instanceof Error ? error.message : "Please try again."}`,
        },
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      scrollToBottom();
    },
  });

  const sendUserMessage = useCallback(
    (text: string) => {
      if (!text.trim() || mutation.isPending) return;
      setSuggestedFollowUps([]);
      mutation.mutate(text);
    },
    [mutation]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setTripContext({});
    setSuggestedFollowUps([]);
    setLiveToolCalls([]);
  }, []);

  const switchMode = useCallback((newMode: AgentMode) => {
    setMode(newMode);
    // Add a system hint message when switching modes
    const switchMsg: Message = {
      id: genId(),
      role: "nova",
      content: {
        type: "text",
        text:
          newMode === "travel"
            ? "Switched to **Travel Agent** mode. I can now search for hotels, flights, activities, plan itineraries, and research destinations. What would you like to plan?"
            : "Switched to **General AI** mode. Ask me anything — technology, writing, science, languages, advice, or any topic you'd like to explore.",
      },
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, switchMsg]);
  }, []);

  return {
    messages,
    mode,
    tripContext,
    liveToolCalls,
    suggestedFollowUps,
    isThinking: mutation.isPending,
    sendMessage: sendUserMessage,
    clearConversation,
    switchMode,
    bottomRef,
  };
}
