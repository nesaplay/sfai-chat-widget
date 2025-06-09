import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Params = { threadId: string }; // Simpler type for params

export async function PATCH(request: Request, segmentData: any) {
  // 1. Await Request Body
  let requestData;
  try {
    requestData = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 2. Extract Params & Body
  const { threadId } = segmentData.params; // No need to await here
  const { title } = requestData;

  // 3. Initial Validation
  if (!threadId) {
    return NextResponse.json({ error: "Thread ID is required" }, { status: 400 });
  }
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required and must be a non-empty string" }, { status: 400 });
  }

  // --- Removed cookie-based client initialization ---
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      console.error("Auth Error in PATCH /api/chat/threads/[threadId]:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 4. Initialize Supabase Service Client
    const supabaseService = createServiceRoleClient();

    // 5. Verify Thread Ownership
    const { data: threadOwnerData, error: ownerCheckError } = await supabaseService
      .from("threads")
      .select("user_id") // Select only needed field for check
      .eq("id", threadId)
      .eq("user_id", userId)
      .maybeSingle(); // Use maybeSingle for existence and fetching

    if (ownerCheckError) {
      console.error(`PATCH Thread: Error fetching thread ${threadId}:`, ownerCheckError);
      return NextResponse.json({ error: "Failed to verify thread access" }, { status: 500 });
    }

    if (!threadOwnerData) {
      console.warn(`PATCH Thread: Thread ${threadId} not found.`);
      // Return 404 if not found or 403 if found but not owned (more specific)
      const status = !threadOwnerData ? 404 : 403;
      const errorMsg = !threadOwnerData ? "Thread not found" : "Access denied";
      return NextResponse.json({ error: errorMsg }, { status });
    }
    // --- End Ownership Check ---

    console.log(`PATCH Thread: Updating title for thread ${threadId}`);

    const trimmedTitle = title.trim();
    const updateTimestamp = new Date().toISOString();

    // 6. Update the thread title using service client
    const { data, error: updateError } = await supabaseService
      .from("threads")
      .update({ title: trimmedTitle, updated_at: updateTimestamp })
      .eq("id", threadId)
      .select("id, title, updated_at")
      .single();

    if (updateError) {
      console.error(`PATCH Thread: Error updating thread title for thread ${threadId}:`, updateError);
      return NextResponse.json({ error: "Failed to update thread title" }, { status: 500 });
    }

    console.log(`PATCH Thread: Successfully updated title for thread ${threadId}`);
    return NextResponse.json(data);
  } catch (error) {
    // Catch unexpected errors
    console.error(`PATCH Thread: Unexpected error for thread ${threadId}:`, error);
    return NextResponse.json({ error: "Internal server error during thread update" }, { status: 500 });
  }
}

// Add DELETE handler if needed, following the same pattern
// export async function DELETE(request: Request, segmentData: { params: Params }) { ... }
