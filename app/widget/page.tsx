"use client";

import { useEffect, useState } from "react";
import ChatContainer from "@/components/chats/chat-container";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/store/use-chat-store";
import { WidgetDataContext } from "./page-types";
import { Session } from "@supabase/supabase-js";

export default function ChatWidget() {
  // Use the shared store to set the context for ChatContainer
  const { setContext } = useChatStore();
  const [session, setSession] = useState<Session | null>(null);

  // This useEffect handles the anonymous Supabase session for the widget user
  useEffect(() => {
    const supabase = createClient();

    const checkAndSignIn = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session || session.user.is_anonymous) {
          console.log("No active session or is anonymous, signing in to ensure session...");
          const { error: signInError, data: { user, session } } = await supabase.auth.signInAnonymously();
          if (signInError) {
            console.error("Error signing in anonymously:", signInError);
          } else {
            console.log("Signed in anonymously successfully.");
            setSession(session);
          }
        } else {
          console.log("Active session found:", session.user.id);
        }
      } catch (error) {
        console.error("Error checking/signing in session:", error);
      }
    };
    checkAndSignIn();
  }, []);

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
  return <ChatContainer session={session} />;
}
