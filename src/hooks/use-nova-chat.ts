/**
 * NOVA Travel Agent — Client-side Chat Hook
 *
 * Manages conversation state, active chat sessions, mode, trip context,
 * document attachments, and server communication.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sendMessage, checkApiStatus } from "@/lib/nova/server-fns";
import type {
  Message,
  TripContext,
  AgentMode,
  ToolCall,
  AgentResponse,
  DocumentAttachment,
} from "@/lib/nova/types";
import {
  getAllChats,
  getChat,
  saveChat,
  deleteChat,
  getActiveChatId,
  setActiveChatId,
  createNewChat,
  type ChatSession,
} from "@/lib/chat-storage";
import { getSavedTripContext, saveTripContext, clearSavedTripContext } from "@/lib/trip-storage";

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
  // Ensure an active chat session exists
  const [activeChatIdState, setActiveChatIdState] = useState<string>(() => {
    let currentId = getActiveChatId();
    if (!currentId) {
      const existing = getAllChats();
      if (existing.length > 0 && existing[0]) {
        currentId = existing[0].id;
        setActiveChatId(currentId);
      } else {
        const savedCtx = getSavedTripContext() ?? options.initialContext ?? {};
        const fresh = createNewChat({
          tripContext: savedCtx,
          title: savedCtx.destination ? `Trip to ${savedCtx.destination}` : "New Trip",
        });
        currentId = fresh.id;
      }
    }
    return currentId;
  });

  const [chats, setChats] = useState<ChatSession[]>(() => getAllChats());

  const activeChat = chats.find((c) => c.id === activeChatIdState) ?? getChat(activeChatIdState);

  const [messages, setMessages] = useState<Message[]>(() => activeChat?.messages ?? []);
  const [mode, setMode] = useState<AgentMode>(options.initialMode ?? "travel");
  const [tripContext, setTripContext] = useState<TripContext>(
    () => activeChat?.tripContext ?? getSavedTripContext() ?? options.initialContext ?? {}
  );
  const [liveToolCalls, setLiveToolCalls] = useState<ToolCall[]>([]);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync chats list on storage events
  useEffect(() => {
    const handleChatsUpdated = () => {
      const all = getAllChats();
      setChats(all);
      const currentId = getActiveChatId();
      if (currentId && currentId !== activeChatIdState) {
        setActiveChatIdState(currentId);
        const target = all.find((c) => c.id === currentId);
        if (target) {
          setMessages(target.messages);
          setTripContext(target.tripContext);
        }
      }
    };

    window.addEventListener("tunitravel_chats_updated", handleChatsUpdated);
    window.addEventListener("storage", handleChatsUpdated);
    return () => {
      window.removeEventListener("tunitravel_chats_updated", handleChatsUpdated);
      window.removeEventListener("storage", handleChatsUpdated);
    };
  }, [activeChatIdState]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Build history for the AI from messages (last 10 exchanges = 20 messages)
  const buildHistory = useCallback((msgs: Message[]) => {
    return msgs
      .slice(-20)
      .map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        text: m.content.text ?? (m.attachment ? `[Attached file: ${m.attachment.name}]` : ""),
      }))
      .filter((h) => h.text.length > 0);
  }, []);

  const mutation = useMutation({
    mutationFn: async ({
      userText,
      attachment,
    }: {
      userText: string;
      attachment?: DocumentAttachment | undefined;
    }) => {
      // Add user message immediately
      const userMsg: Message = {
        id: genId(),
        role: "user",
        content: { type: "text", text: userText },
        ...(attachment ? { attachment } : {}),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      scrollToBottom();

      // Show thinking state
      setLiveToolCalls([
        {
          id: "thinking",
          name: attachment ? "analyze_document" : "thinking",
          label: attachment
            ? `Analyzing ${attachment.name}...`
            : "NOVA is thinking…",
          status: "running",
          startedAt: Date.now(),
        },
      ]);

      // Build history excluding the message we just added
      const history = buildHistory(messages);

      const response = (await sendMessage({
        data: {
          message: userText || (attachment ? `Analyze this travel document: ${attachment.name}` : ""),
          history,
          tripContext,
          mode,
          ...(attachment ? { attachment } : {}),
        },
      })) as AgentResponse;

      return { response, userMsg };
    },

    onSuccess: ({ response, userMsg }) => {
      // Update live tool calls
      setLiveToolCalls(response.toolCalls);

      // Add NOVA's response
      const novaMsg: Message = {
        id: genId(),
        role: "nova",
        content: response.content,
        toolCalls: response.toolCalls,
        timestamp: Date.now(),
      };

      const updatedMessages = [...messages, userMsg, novaMsg];
      setMessages(updatedMessages);
      setTripContext(response.updatedTripContext);
      saveTripContext(response.updatedTripContext);
      setSuggestedFollowUps(response.suggestedFollowUps ?? []);

      // Persist to the active chat session in chat-storage
      saveChat({
        id: activeChatIdState,
        title: activeChat?.title ?? "New Trip",
        messages: updatedMessages,
        tripContext: response.updatedTripContext,
        status: response.updatedTripContext.isPlanConfirmed ? "confirmed" : "planning",
        createdAt: activeChat?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      });

      // Clear live tool calls after a delay
      setTimeout(() => setLiveToolCalls([]), 1500);
      scrollToBottom();
    },

    onError: (error) => {
      setLiveToolCalls([]);
      const raw = error instanceof Error ? error.message : String(error);

      let friendlyText: string;
      if (raw.includes("503") || raw.includes("UNAVAILABLE") || raw.includes("high demand")) {
        friendlyText = "The AI is temporarily overloaded due to high demand. Please wait a moment and try again — it's usually resolved within a few seconds.";
      } else if (raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED")) {
        friendlyText = "NOVA has hit a temporary rate limit. Please wait a few seconds and try again.";
      } else if (raw.includes("GEMINI_API_KEY")) {
        friendlyText = "NOVA's API key is not configured. Please add your Gemini API key.";
      } else {
        friendlyText = "Something went wrong. Please try again.";
      }

      const errorMsg: Message = {
        id: genId(),
        role: "nova",
        content: {
          type: "error",
          text: friendlyText,
        },
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      scrollToBottom();
    },
  });

  const sendUserMessage = useCallback(
    (text: string, attachment?: DocumentAttachment | undefined) => {
      if ((!text.trim() && !attachment) || mutation.isPending) return;
      setSuggestedFollowUps([]);
      mutation.mutate({ userText: text, attachment });
    },
    [mutation]
  );

  const switchChat = useCallback((id: string) => {
    setActiveChatId(id);
    setActiveChatIdState(id);
    const target = getChat(id);
    if (target) {
      setMessages(target.messages);
      setTripContext(target.tripContext);
      saveTripContext(target.tripContext);
    } else {
      setMessages([]);
      setTripContext({});
      clearSavedTripContext();
    }
    setSuggestedFollowUps([]);
    setLiveToolCalls([]);
  }, []);

  const createNewTrip = useCallback(() => {
    const fresh = createNewChat({
      title: "New Trip",
      messages: [],
      tripContext: {},
    });
    setActiveChatIdState(fresh.id);
    setMessages([]);
    setTripContext({});
    clearSavedTripContext();
    setSuggestedFollowUps([]);
    setLiveToolCalls([]);
  }, []);

  const removeChat = useCallback(
    (id: string) => {
      deleteChat(id);
      const remaining = getAllChats();
      setChats(remaining);
      if (id === activeChatIdState) {
        if (remaining.length > 0 && remaining[0]) {
          switchChat(remaining[0].id);
        } else {
          createNewTrip();
        }
      }
    },
    [activeChatIdState, switchChat, createNewTrip]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setTripContext({});
    clearSavedTripContext();
    setSuggestedFollowUps([]);
    setLiveToolCalls([]);
    if (activeChat) {
      saveChat({
        ...activeChat,
        messages: [],
        tripContext: {},
        title: "New Trip",
        status: "new",
        updatedAt: Date.now(),
      });
    }
  }, [activeChat]);

  const switchMode = useCallback((newMode: AgentMode) => {
    setMode(newMode);
    const switchMsg: Message = {
      id: genId(),
      role: "nova",
      content: {
        type: "text",
        text:
          newMode === "travel"
            ? "Switched to **Travel Agent** mode. I can plan itineraries, search hotels, compare flights, analyze tickets/vouchers, and research destinations. What would you like to plan?"
            : "Switched to **General AI** mode. Ask me anything — technology, writing, science, advice, or general conversation.",
      },
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, switchMsg]);
  }, []);

  const updateTripContext = useCallback(
    (updater: Partial<TripContext> | ((prev: TripContext) => TripContext)) => {
      setTripContext((prev) => {
        const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        saveTripContext(next);
        if (activeChat) {
          saveChat({
            ...activeChat,
            tripContext: next,
            updatedAt: Date.now(),
          });
        }
        return next;
      });
    },
    [activeChat]
  );

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
    updateTripContext,
    bottomRef,
    // Multi-chat management
    chats,
    activeChatId: activeChatIdState,
    activeChat,
    switchChat,
    createNewTrip,
    removeChat,
  };
}
