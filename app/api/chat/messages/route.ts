import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Database } from '@/types/supabase';

type Message = Database['public']['Tables']['messages']['Row'];

// --- Get the Predefined Widget User ID ---
const chatWidgetUserId = process.env.CHAT_WIDGET_USER_ID;
// --- End Widget User ID ---

export async function GET(request: Request) {
  // Check for the environment variable inside the request handler
  if (!chatWidgetUserId) {
      console.error("GET /api/chat/messages Error: CHAT_WIDGET_USER_ID environment variable is not set.");
      return NextResponse.json({ error: "Server configuration error: Widget user not configured." }, { status: 500 });
  }

  // Removed cookieStore
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("thread_id");

  if (!threadId) {
    return NextResponse.json({ error: "thread_id query parameter is required" }, { status: 400 });
  }

  // --- Authentication Removed ---
  const userId = chatWidgetUserId; // Use the predefined ID
  console.log(`GET Messages: Acting as predefined Widget User: ${userId} for Thread: ${threadId}`);
  // --- End Authentication Removal ---

  // Use service client for DB access
  const supabaseService = createServiceRoleClient();

  try {
    // --- Verify Thread Ownership (Important!) ---
    // Before fetching messages, make sure the thread belongs to the widget user
    const { data: threadData, error: threadError } = await supabaseService
      .from('threads')
      .select('id')
      .eq('id', threadId)
      .eq('user_id', userId) // Check ownership
      .maybeSingle(); // Use maybeSingle to check existence

    if (threadError) {
      console.error(`Supabase GET thread check error for user ${userId}, thread ${threadId}:`, threadError);
      return NextResponse.json({ error: `Failed to verify thread access: ${threadError.message}` }, { status: 500 });
    }

    if (!threadData) {
      console.warn(`GET Messages: Thread ${threadId} not found or not owned by widget user ${userId}.`);
      return NextResponse.json({ error: "Thread not found or access denied" }, { status: 404 });
    }
    // --- End Thread Ownership Check ---

    // --- Fetch messages for the verified thread ---
    console.log(`GET Messages: Fetching messages for thread ${threadId} (owned by ${userId})`);

    const { data: messages, error: messagesError } = await supabaseService
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error(`Supabase GET messages error for thread ${threadId}:`, messagesError);
      return NextResponse.json({ error: `Failed to fetch messages: ${messagesError.message}` }, { status: 500 });
    }

    console.log(`GET Messages: Found ${messages?.length || 0} messages for thread ${threadId}`);
    return NextResponse.json({ messages: (messages || []) as Message[] });

  } catch (error: any) {
    console.error(`Unexpected GET /api/chat/messages error for thread ${threadId}, user ${userId}:`, error);
    return NextResponse.json({ error: "An unexpected error occurred while fetching messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
   // Check for the environment variable inside the request handler
   if (!chatWidgetUserId) {
      console.error("POST /api/chat/messages Error: CHAT_WIDGET_USER_ID environment variable is not set.");
      return NextResponse.json({ error: "Server configuration error: Widget user not configured." }, { status: 500 });
  }

  // Removed cookieStore
  let messageData;

  try {
    messageData = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content, thread_id, assistant_id, role, metadata } = messageData; // Include other potential fields

  if (!content || !thread_id) {
    return NextResponse.json({ error: "Missing required fields: content, thread_id" }, { status: 400 });
  }

  // --- Authentication Removed ---
  const userId = chatWidgetUserId; // Use the predefined ID
  console.log(`POST Message: Acting as predefined Widget User: ${userId} for Thread: ${thread_id}`);
  // --- End Authentication Removal ---

  // --- Use Service Role for DB Write ---
  const supabaseService = createServiceRoleClient();

  try {
    // --- Verify Thread Ownership (Important!) ---
    // Before inserting, make sure the thread belongs to the widget user
    const { data: threadData, error: threadError } = await supabaseService
      .from('threads')
      .select('id, assistant_id') // Select assistant_id if needed for message
      .eq('id', thread_id)
      .eq('user_id', userId) // Check ownership
      .maybeSingle();

    if (threadError) {
      console.error(`Supabase POST thread check error for user ${userId}, thread ${thread_id}:`, threadError);
      return NextResponse.json({ error: `Failed to verify thread access: ${threadError.message}` }, { status: 500 });
    }

    if (!threadData) {
      console.warn(`POST Message: Thread ${thread_id} not found or not owned by widget user ${userId}.`);
      return NextResponse.json({ error: "Thread not found or access denied" }, { status: 400 }); // Use 400 for bad request
    }
    // --- End Thread Ownership Check ---

    console.log(`POST Message: Inserting message from user ${userId} into thread ${thread_id}`);

    const messageToInsert = {
      thread_id: thread_id,
      user_id: userId, // Always the widget user ID
      // Use assistant_id from thread or request? Clarify logic.
      // If assistant response, assistant_id should be set, role='assistant'
      // If user message, assistant_id is likely null, role='user'
      assistant_id: role === 'assistant' ? (assistant_id || threadData.assistant_id) : null,
      role: role || "user", // Default to 'user' if not provided
      content: content,
      // completed: true, // Is this field always true on user POST?
      metadata: metadata || null,
    };

    const { data: newMessage, error: insertError } = await supabaseService
      .from("messages")
      .insert(messageToInsert)
      .select()
      .single();

    if (insertError) {
      console.error(`Supabase POST message error for thread ${thread_id}, user ${userId}:`, insertError);
      // Check foreign key constraint violation (invalid thread_id)
      if (insertError.code === "23503") {
        // This should be caught by the ownership check now, but keep as safeguard
        return NextResponse.json({ error: `Invalid thread_id or related constraint failed: ${thread_id}` }, { status: 400 });
      }
      return NextResponse.json({ error: `Failed to save message: ${insertError.message}` }, { status: 500 });
    }

    console.log(`POST Message: Successfully inserted message ${newMessage.id} for user ${userId}`);
    return NextResponse.json(newMessage as Message, { status: 201 });

  } catch (error: any) {
    console.error(`Unexpected POST message error for thread ${thread_id}, user ${userId}:`, error);
    return NextResponse.json({ error: "An unexpected error occurred while saving the message" }, { status: 500 });
  }
}
