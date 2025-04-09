"use client";

import ChatBubble from "@/components/chats/chat-bubble";
import { useEffect } from "react";
import mockData from "./mockData";
import { useChatStore } from "@/lib/store/use-chat-store";

export default function ChatWidget() {
  const { setWidgetData } = useChatStore();

  // Handle iframe messages from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle data
      if (event.data && event.data.type === "widget-data") {
        console.log("Received data in widget:", event.data.data);
        // setWidgetData(event.data.data);
      }
    };

    setWidgetData(mockData);

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return <ChatBubble />;
}
