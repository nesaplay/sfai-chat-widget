import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Database } from '@/types/supabase';

type Message = Database['public']['Tables']['messages']['Row'];
type Thread = Pick<
    Database['public']['Tables']['threads']['Row'],
    'id' | 'title' | 'updated_at' | 'assistant_id' | 'created_at'
>;

// --- Get the Predefined Widget User ID ---
const chatWidgetUserId = process.env.CHAT_WIDGET_USER_ID;

// We need to handle the case where the env var might be missing at runtime,
// even if configured during build. Returning an error inside the handler is safer.
// --- End Widget User ID ---

export async function GET(request: Request) {
    // Check for the environment variable inside the request handler
    if (!chatWidgetUserId) {
        console.error("GET /api/chat/init Error: CHAT_WIDGET_USER_ID environment variable is not set.");
        // Return a server error if the ID isn't configured
        return NextResponse.json({ error: "Server configuration error: Widget user not configured." }, { status: 500 });
    }

    // We no longer need cookieStore
  const { searchParams } = new URL(request.url);
  const assistantId = searchParams.get("assistantId");

  if (!assistantId) {
    return NextResponse.json({ error: "assistantId query parameter is required" }, { status: 400 });
  }

    // --- Authentication Removed ---
    // No need to check tokens or cookies. We *always* act as the chatWidgetUserId.
    const userId = chatWidgetUserId; // Use the predefined ID
    console.log(`GET Init: Acting as predefined Widget User: ${userId} for Assistant: ${assistantId}`);
    // --- End Authentication Removal ---


    // Ensure we use the service role client for database operations
  const supabaseService = createServiceRoleClient();

  try {
        // 1. Fetch all threads for the *predefined widget user* & assistant
    const { data: threadsData, error: threadsError } = await supabaseService
      .from('threads')
      .select('id, title, updated_at, assistant_id, created_at')
            .eq('user_id', userId) // Use the predefined widget user ID
      .eq('assistant_id', assistantId)
      .order('updated_at', { ascending: false });

    if (threadsError) {
            console.error(`Supabase GET threads error for user ${userId}, assistant ${assistantId}:`, threadsError);
      return NextResponse.json({ error: `Failed to fetch threads: ${threadsError.message}` }, { status: 500 });
    }

    const threads = (threadsData || []) as Thread[];
    let messagesForLatestThread: Message[] = [];

    // 2. If threads exist, fetch messages for the most recent one
    if (threads.length > 0) {
      const latestThreadId = threads[0].id;
            console.log(`GET Init: Found ${threads.length} threads for widget user ${userId}, fetching messages for latest: ${latestThreadId}`);
      const { data: messagesData, error: messagesError } = await supabaseService
        .from('messages')
        .select('*')
        .eq('thread_id', latestThreadId)
                // We assume messages are tied to the thread, which is tied to the user.
                // No need for `.eq('user_id', userId)` here unless your schema requires it on messages too.
        .order('created_at', { ascending: true });

      if (messagesError) {
                console.error(`Supabase GET latest messages error for thread ${latestThreadId}:`, messagesError);
        // Don't fail the whole request, just return empty messages for this thread
      } else {
          messagesForLatestThread = (messagesData || []) as Message[];
                console.log(`GET Init: Found ${messagesForLatestThread.length} messages for thread ${latestThreadId}`);
      }
    } else {
            console.log(`GET Init: No threads found for assistant ${assistantId} and widget user ${userId}`);
    }

    // Return both threads and the messages for the latest thread
    return NextResponse.json({ threads: threads, messages: messagesForLatestThread });

  } catch (error: any) {
        console.error(`Unexpected GET /api/chat/init error for user ${userId}, assistant ${assistantId}:`, error);
    return NextResponse.json({ error: "An unexpected error occurred during initialization" }, { status: 500 });
  }
} 