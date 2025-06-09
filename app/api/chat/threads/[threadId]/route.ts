import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// --- Get the Predefined Widget User ID ---
const chatWidgetUserId = process.env.CHAT_WIDGET_USER_ID;
// --- End Widget User ID ---

type Params = { threadId: string }; // Simpler type for params

export async function PATCH(request: Request, segmentData: { params: Params }) {
  // Check for the environment variable inside the request handler
  if (!chatWidgetUserId) {
      console.error("PATCH /api/chat/threads/[threadId] Error: CHAT_WIDGET_USER_ID environment variable is not set.");
      return NextResponse.json({ error: "Server configuration error: Widget user not configured." }, { status: 500 });
  }

  // 1. Await Request Body
  let requestData
  try {
    requestData = await request.json()
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // 2. Extract Params & Body
  const { threadId } = segmentData.params // No need to await here
  const { title } = requestData

  // 3. Initial Validation
  if (!threadId) {
    return NextResponse.json({ error: "Thread ID is required" }, { status: 400 })
  }
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required and must be a non-empty string" }, { status: 400 })
  }

  // --- Removed cookie-based client initialization ---
  try {
    // 4. Initialize Supabase Service Client
    const supabaseService = createServiceRoleClient();
    const userId = chatWidgetUserId; // Use predefined ID
    console.log(`PATCH Thread: Acting as predefined Widget User: ${userId} for Thread: ${threadId}`);

    // 5. Verify Thread Ownership
    const { data: threadOwnerData, error: ownerCheckError } = await supabaseService
      .from("threads")
      .select("user_id") // Select only needed field for check
      .eq("id", threadId)
      .maybeSingle() // Use maybeSingle for existence and fetching

    if (ownerCheckError) {
        console.error(`PATCH Thread: Error fetching thread ${threadId} for ownership check by user ${userId}:`, ownerCheckError)
        return NextResponse.json({ error: "Failed to verify thread access" }, { status: 500 })
    }

    if (!threadOwnerData || threadOwnerData.user_id !== userId) {
        console.warn(`PATCH Thread: Thread ${threadId} not found or not owned by widget user ${userId}.`);
        // Return 404 if not found or 403 if found but not owned (more specific)
        const status = !threadOwnerData ? 404 : 403;
        const errorMsg = !threadOwnerData ? "Thread not found" : "Access denied";
        return NextResponse.json({ error: errorMsg }, { status });
    }
    // --- End Ownership Check ---

    console.log(`PATCH Thread: Updating title for thread ${threadId} owned by ${userId}`);

    const trimmedTitle = title.trim()
    const updateTimestamp = new Date().toISOString()

    // 6. Update the thread title using service client
    const { data, error: updateError } = await supabaseService
      .from("threads")
      .update({ title: trimmedTitle, updated_at: updateTimestamp })
      .eq("id", threadId)
      // Ensure the update also respects the user ID (redundant due to check above, but safe)
      .eq("user_id", userId)
      .select("id, title, updated_at")
      .single()

    if (updateError) {
      console.error(`PATCH Thread: Error updating thread title for thread ${threadId}, user ${userId}:`, updateError)
      return NextResponse.json({ error: "Failed to update thread title" }, { status: 500 })
    }

    console.log(`PATCH Thread: Successfully updated title for thread ${threadId}`);
    return NextResponse.json(data)

  } catch (error) {
    // Catch unexpected errors
    console.error(`PATCH Thread: Unexpected error for thread ${threadId}, user ${chatWidgetUserId}:`, error)
    return NextResponse.json({ error: "Internal server error during thread update" }, { status: 500 })
  }
}

// Add DELETE handler if needed, following the same pattern
// export async function DELETE(request: Request, segmentData: { params: Params }) { ... }
