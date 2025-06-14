import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { cookies } from "next/headers";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type Thread = Pick<
  Database["public"]["Tables"]["threads"]["Row"],
  "id" | "title" | "updated_at" | "assistant_id" | "created_at"
>;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assistantId = searchParams.get("assistantId");

  if (!assistantId) {
    return NextResponse.json({ error: "assistantId query parameter is required" }, { status: 400 });
  }

  try {
    // Get the Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("No Authorization header found");
      return NextResponse.json({ error: "No authorization token provided" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const cookieStore = await cookies();
    const supabaseAuth = createClient(cookieStore);
    
    // Verify the token
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !user) {
      console.error(`Auth Error in GET /api/chat/init:`, userError);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = user.id;
    console.log(`GET /api/chat/init: Authenticated user ${userId}`);

    // Ensure we use the service role client for database operations
    const supabaseService = createServiceRoleClient();

    // 1. Fetch all threads for the user & assistant
    const { data: threadsData, error: threadsError } = await supabaseService
      .from("threads")
      .select("id, title, updated_at, assistant_id, created_at")
      .eq("assistant_id", assistantId)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (threadsError) {
      console.error(`Supabase GET threads error for assistant ${assistantId}:`, threadsError);
      return NextResponse.json({ error: `Failed to fetch threads: ${threadsError.message}` }, { status: 500 });
    }

    const threads = (threadsData || []) as Thread[];
    let messagesForLatestThread: Message[] = [];

    // 2. If threads exist, fetch messages for the most recent one
    if (threads.length > 0) {
      const latestThreadId = threads[0].id;
      console.log(
        `GET Init: Found ${threads.length} threads for assistant ${assistantId}, fetching messages for latest: ${latestThreadId}`,
      );
      const { data: messagesData, error: messagesError } = await supabaseService
        .from("messages")
        .select("*")
        .eq("thread_id", latestThreadId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error(`Supabase GET latest messages error for thread ${latestThreadId}:`, messagesError);
        // Don't fail the whole request, just return empty messages for this thread
      } else {
        messagesForLatestThread = (messagesData || []) as Message[];
        console.log(`GET Init: Found ${messagesForLatestThread.length} messages for thread ${latestThreadId}`);
      }
    } else {
      console.log(`GET Init: No threads found for assistant ${assistantId} and user ${userId}`);
    }

    // Return both threads and the messages for the latest thread
    return NextResponse.json({ threads: threads, messages: messagesForLatestThread });
  } catch (error: any) {
    console.error(`Unexpected GET /api/chat/init error for assistant ${assistantId}:`, error);
    return NextResponse.json({ error: "An unexpected error occurred during initialization" }, { status: 500 });
  }
}
