"use client";

import { useEffect, useState } from "react";
import ChatContainer from "@/components/chats/chat-container";
import { useChatStore } from "@/lib/store/use-chat-store";
import { WidgetDataContext } from "./page-types";

export default function ChatWidget() {
  // Use the shared store to set the context for ChatContainer
  const { setContext } = useChatStore();

  // This useEffect handles messages received from the parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // For security, you should check event.origin in a production environment
      // if (event.origin !== 'https://your-parent-app.com') return;

      if (event.data && event.data.type === "widget-data" && event.data.data) {
        const receivedData: Partial<WidgetDataContext> = event.data.data;
        console.log("Widget: Received data payload:", receivedData);

        // Check for the specific data structure you're sending - using capitalized property names from the type
        if (receivedData.Overview && receivedData.Dimensions) {
          console.log("Widget: Setting analytics data as context...");
          // Set the received data into the shared store's context
          setContext({ data: receivedData, filters: null });
        } else {
          console.warn(
            "Widget: Received widget-data but it did not match the expected analytics data shape.",
            receivedData,
          );
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setContext]); // Add setContext to dependency array

  // ChatContainer will pull its state (including context) from the useChatStore
  return <ChatContainer />;
}
