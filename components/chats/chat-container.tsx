"use client";

import { useEffect, useState } from "react";
import ChatContent from "@/components/chats/chat-content";
import { useToast } from "@/hooks/use-toast";
import { useChatStore } from "@/lib/store/use-chat-store";
import useAsyncEffect from "@/hooks/useAsyncEffect";
import mockData, { getDataBasedOnALabel } from "@/app/widget/mockData";

interface Message {
  id: string;
  content: string;
  type: "user" | "assistant";
  completed?: boolean;
  newSection?: boolean;
}

interface Section {
  id: string;
  label: string;
  assistantName: string;
  welcomeMessage: string[];
  file?: {
    name: string;
  };
  assistantId: string;
  instructions: string;
  widgetDataLabels?: string[];
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<{ filename: string; buffer: string }[]>([]);
  const { setLoading, activeSection, loading, isOpen } = useChatStore();

  // Load messages and files on active section change
  useAsyncEffect(async () => {
    if (!activeSection || !isOpen) return;

    try {
      setLoading(true);
      await loadMessages(activeSection, true);
    } finally {
      setLoading(false);
    }
  }, [activeSection, isOpen]);

  const loadMessages = async (activeSection: { id: string; label: string; assistantName: string }, init?: boolean) => {
    try {
      const response = await fetch(`/api/chat/messages?init=${init}&assistantId=${activeSection.id}`);
      if (!response.ok) throw new Error("Failed to load messages");
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (message: Message) => {
    try {
      const response = await fetch(`/api/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error("Failed to save message:", await response.text());
        throw new Error("Failed to save message");
      }

      return response.json();
    } catch (error) {
      console.error("Error saving message:", error);
      toast({
        title: "Error",
        description: "Failed to save message to storage",
        variant: "destructive",
      });
      return false;
    }
  };

  const clearMessages = async () => {
    try {
      const response = await fetch(`/api/chat/messages`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to clear messages");
      setMessages([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear chat history",
        variant: "destructive",
      });
    }
  };

  const handleStreamMessage = async (
    message: string,
    onWord: (word: string) => void,
    params: { filename?: string; label?: string },
  ) => {
    console.log("Sending message with context:", params?.label ? getDataBasedOnALabel(params.label.replace("#", "")) : mockData);

    const response = await fetch(`/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        filename: params?.filename,
        labelData: params?.label ? getDataBasedOnALabel(params.label.replace("#", "")) : mockData,
        assistantId: activeSection?.id,
        assistantName: activeSection?.assistantName,
      }),
    });

    if (!response.ok) throw new Error("Failed to stream message");

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        onWord(text);
      }
    } finally {
      reader.releaseLock();
    }
  };

  const handleMessagesChange = async (newMessages: Message[]) => {
    // Update local state immediately
    setMessages(newMessages);

    try {
      // Save only the last message
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage) {
        await handleSendMessage(lastMessage);
      }
    } catch (error) {
      console.error("Failed to save message:", error);
      toast({
        title: "Error",
        description: "Failed to save message",
        variant: "destructive",
      });
    }
  };

  return (
    <ChatContent
      messages={messages}
      onMessagesChange={handleMessagesChange}
      onClearChat={clearMessages}
      onSendMessage={handleSendMessage}
      onStreamMessage={handleStreamMessage}
      taggedFileNames={uploadedFiles.map((file) => file.filename)}
      loading={loading}
    />
  );
}
