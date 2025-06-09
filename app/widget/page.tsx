"use client";

import { useEffect, useState } from "react";
import ChatContainer from "@/components/chats/chat-container";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/store/use-chat-store";
import { WidgetDataContext } from "./page-types";
import { Session } from "@supabase/supabase-js";

// Create a custom fetch function that includes the session token
const createAuthenticatedFetch = (session: Session | null) => {
  return async (url: string, options: RequestInit = {}) => {
    if (!session?.access_token) {
      throw new Error("No session token available");
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);

    return fetch(url, {
      ...options,
      headers,
    });
  };
};

export default function ChatWidget() {
  const { setContext } = useChatStore();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // This useEffect handles the anonymous Supabase session for the widget user
  useEffect(() => {
    const supabase = createClient();

    const initializeSession = async () => {
      try {
        setIsLoading(true);
        
        // First check for existing session
        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          throw sessionError;
        }

        if (existingSession) {
          console.log("Found existing session:", existingSession.user.id);
          setSession(existingSession);
          setIsLoading(false);
          return;
        }

        // If no session exists, sign in anonymously
        console.log("No active session found, signing in anonymously...");
        const { data: { session: newSession }, error: signInError } = await supabase.auth.signInAnonymously();
        
        if (signInError) {
          console.error("Error signing in anonymously:", signInError);
          throw signInError;
        }

        if (newSession) {
          console.log("Successfully signed in anonymously:", newSession.user.id);
          setSession(newSession);
        }
      } catch (error) {
        console.error("Error initializing session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initialize session immediately
    initializeSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state changed:", event, currentSession?.user.id);
      
      if (event === 'SIGNED_OUT') {
        // If signed out, try to sign in anonymously again
        const { data: { session: newSession }, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) {
          console.error("Error re-signing in anonymously:", signInError);
        } else if (newSession) {
          console.log("Re-signed in anonymously:", newSession.user.id);
          setSession(newSession);
        }
      } else {
        setSession(currentSession);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
  }, [setContext]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Only render ChatContainer when we have a session
  return session ? <ChatContainer session={session} authenticatedFetch={createAuthenticatedFetch(session)} /> : null;
}
