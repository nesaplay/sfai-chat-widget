import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { cookies } from "next/headers";

type Message = Database["public"]["Tables"]["messages"]["Row"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("thread_id");

  if (!threadId) {
    return NextResponse.json({ error: "thread_id query parameter is required" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const supabaseAuth = createClient(cookieStore);
    
    // First try to get the session
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();
    
    if (sessionError) {
      console.error(`Session Error in GET /api/chat/messages:`, sessionError);
      return NextResponse.json({ error: `Session Error: ${sessionError.message}` }, { status: 401 });
    }

    if (!session) {
      console.error(`Auth Error in GET /api/chat/messages: No session found`);
      return NextResponse.json({ error: "No active session found" }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(`GET /api/chat/messages: Authenticated user ${userId}`);

    // Ensure we use the service role client for database operations
    const supabaseService = createServiceRoleClient();

    // First verify the thread belongs to the user
    const { data: threadData, error: threadError } = await supabaseService
      .from("threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", userId)
      .single();

    if (threadError || !threadData) {
      console.error(`Thread access error for user ${userId} and thread ${threadId}:`, threadError);
      return NextResponse.json({ error: "Thread not found or access denied" }, { status: 403 });
    }

    // Fetch messages for the thread
    const { data: messagesData, error: messagesError } = await supabaseService
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error(`Error fetching messages for thread ${threadId}:`, messagesError);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    const messages = (messagesData || []) as Message[];
    console.log(`Found ${messages.length} messages for thread ${threadId}`);

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error(`Unexpected error in GET /api/chat/messages:`, error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

  const cookieStore = await cookies();
  const supabaseAuth = createClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    console.error("Auth Error in POST /api/chat/messages:", authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Use Service Role for DB Write ---
  const supabaseService = createServiceRoleClient();

  try {
    // --- Verify Thread Ownership (Important!) ---
    // Before inserting, make sure the thread belongs to the widget user
    const { data: threadData, error: threadError } = await supabaseService
      .from("threads")
      .select("id, assistant_id") // Select assistant_id if needed for message
      .eq("id", thread_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (threadError) {
      console.error(`Supabase POST thread check error for thread ${thread_id}:`, threadError);
      return NextResponse.json({ error: `Failed to verify thread access: ${threadError.message}` }, { status: 500 });
    }

    if (!threadData) {
      console.warn(`POST Message: Thread ${thread_id} not found or not owned by widget user ${userId}.`);
      return NextResponse.json({ error: "Thread not found or access denied" }, { status: 400 }); // Use 400 for bad request
    }
    // --- End Thread Ownership Check ---

    console.log(`POST Message: Inserting message into thread ${thread_id}`);

    const messageToInsert = {
      thread_id: thread_id,
      // Use assistant_id from thread or request? Clarify logic.
      // If assistant response, assistant_id should be set, role='assistant'
      // If user message, assistant_id is likely null, role='user'
      assistant_id: role === "assistant" ? assistant_id || threadData.assistant_id : null,
      role: role || "user", // Default to 'user' if not provided
      content: content,
      user_id: userId,
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
        return NextResponse.json(
          { error: `Invalid thread_id or related constraint failed: ${thread_id}` },
          { status: 400 },
        );
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
