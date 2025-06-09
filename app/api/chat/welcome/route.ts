import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { cookies } from "next/headers";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type Thread = Pick<
  Database["public"]["Tables"]["threads"]["Row"],
  "id" | "title" | "updated_at" | "assistant_id" | "created_at"
>;

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createClient(cookieStore);
    
    // First try to get the session
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();
    
    if (sessionError) {
      console.error(`Session Error in POST /api/chat/welcome:`, sessionError);
      return NextResponse.json({ error: `Session Error: ${sessionError.message}` }, { status: 401 });
    }

    if (!session) {
      console.error(`Auth Error in POST /api/chat/welcome: No session found`);
      return NextResponse.json({ error: "No active session found" }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(`POST /api/chat/welcome: Authenticated user ${userId}`);

    const body = await request.json();
    const { assistantId } = body;

    if (!assistantId) {
      return NextResponse.json({ error: "assistantId is required" }, { status: 400 });
    }

    // Ensure we use the service role client for database operations
    const supabaseService = createServiceRoleClient();

    // Create a new thread
    const { data: threadData, error: threadError } = await supabaseService
      .from("threads")
      .insert({
        title: "Email Management",
        assistant_id: assistantId,
        user_id: userId,
      })
      .select("id, title, updated_at, assistant_id, created_at")
      .single();

    if (threadError) {
      console.error(`Error creating welcome thread for user ${userId}:`, threadError);
      return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
    }

    const thread = threadData as Thread;
    console.log(`Created welcome thread ${thread.id} for user ${userId}`);

    // Create the welcome message
    const { data: messageData, error: messageError } = await supabaseService
      .from("messages")
      .insert({
        thread_id: thread.id,
        role: "assistant",
        content: "Hello! I'm your email management assistant. How can I help you today?",
        assistant_id: assistantId,
        user_id: userId,
      })
      .select("*")
      .single();

    if (messageError) {
      console.error(`Error creating welcome message for thread ${thread.id}:`, messageError);
      return NextResponse.json({ error: "Failed to create welcome message" }, { status: 500 });
    }

    const message = messageData as Message;
    console.log(`Created welcome message ${message.id} for thread ${thread.id}`);

    return NextResponse.json({ thread, message });
  } catch (error: any) {
    console.error(`Unexpected error in POST /api/chat/welcome:`, error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
