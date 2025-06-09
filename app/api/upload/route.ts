import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

type FileInsert = Database['public']['Tables']['files']['Insert'];
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
      console.error(`Session Error in POST /api/upload:`, sessionError);
      return NextResponse.json({ error: `Session Error: ${sessionError.message}` }, { status: 401 });
    }

    if (!session) {
      console.error(`Auth Error in POST /api/upload: No session found`);
      return NextResponse.json({ error: "No active session found" }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(`POST /api/upload: Authenticated user ${userId}`);

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const threadId = formData.get("threadId") as string;
    const assistantId = formData.get("assistantId") as string;

    if (!file || !threadId || !assistantId) {
      return NextResponse.json(
        { error: "Missing required fields: file, threadId, or assistantId" },
        { status: 400 }
      );
    }

    // Ensure we use the service role client for database operations
    const supabaseService = createServiceRoleClient();

    // Verify thread ownership
    const { data: thread, error: threadError } = await supabaseService
      .from("threads")
      .select("id, user_id")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      console.error(`Error fetching thread ${threadId}:`, threadError);
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.user_id !== userId) {
      console.error(`Access denied: User ${userId} tried to access thread ${threadId}`);
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabaseService.storage
      .from("uploads")
      .upload(filePath, file);

    if (uploadError) {
      console.error(`Error uploading file for user ${userId}:`, uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    // Get the public URL
    const { data: { publicUrl } } = supabaseService.storage
      .from("uploads")
      .getPublicUrl(filePath);

    // Create a message with the file attachment
    const { data: messageData, error: messageError } = await supabaseService
      .from("messages")
      .insert({
        thread_id: threadId,
        role: "user",
        content: `Uploaded file: ${file.name}`,
        assistant_id: assistantId,
        user_id: userId,
        metadata: {
          file: {
            name: file.name,
            url: publicUrl,
            type: file.type,
            size: file.size,
          },
        },
      })
      .select("*")
      .single();

    if (messageError) {
      console.error(`Error creating message for thread ${threadId}:`, messageError);
      return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
    }

    const message = messageData as Message;
    console.log(`Created message ${message.id} with file attachment for thread ${threadId}`);

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error(`Unexpected error in POST /api/upload:`, error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("file_id");

  // --- Authentication (Needed for both listing and downloading) ---
  const supabaseAuth = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    console.error('Auth Error in GET /api/upload:', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = user.id;
  // --- End Authentication ---

  const bucketName = 'files'; // Match the bucket used in POST

  if (fileId) {
    // --- Download File ---
    console.log(`Attempting to download file with ID: ${fileId} for user: ${userId}`);
    const supabaseService = createServiceRoleClient(); // Service role might be needed to bypass RLS for path lookup initially if policies are strict

    // 1. Fetch file metadata from DB to get storage_path and verify ownership
    const { data: fileRecord, error: dbFetchError } = await supabaseService
      .from('files')
      .select('storage_path, filename, mime_type')
      .eq('id', fileId)
      .eq('user_id', userId) // Verify ownership
      .single();

    if (dbFetchError || !fileRecord) {
      console.error(`Error fetching file record ${fileId} for user ${userId}:`, dbFetchError);
      return NextResponse.json({ success: false, error: "File not found or access denied." }, { status: 404 });
    }

    const storagePath = fileRecord.storage_path;
    if (!storagePath) {
       console.error(`File record ${fileId} is missing storage_path.`);
       return NextResponse.json({ success: false, error: "File record incomplete." }, { status: 500 });
    }

    // 2. Download from Supabase Storage (use authenticated client to respect Storage RLS)
    const { data: blob, error: downloadError } = await supabaseAuth.storage
        .from(bucketName)
        .download(storagePath);

    if (downloadError) {
        console.error(`Error downloading file ${storagePath} from storage:`, downloadError);
        return NextResponse.json({ success: false, error: `Failed to download file: ${downloadError.message}` }, { status: 500 });
    }

    if (!blob) {
         console.error(`No blob data returned for file ${storagePath}`);
         return NextResponse.json({ success: false, error: "Failed to retrieve file data." }, { status: 500 });
    }

    console.log(`Successfully fetched file ${storagePath} for download.`);
    // Return the blob directly with appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', fileRecord.mime_type || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${fileRecord.filename || fileId}"`);

    return new NextResponse(blob, { status: 200, headers });

  } else {
    // --- List Files ---
    console.log(`Listing files for user: ${userId}`);
    // Use authenticated client to respect RLS for listing
    const { data: files, error: listError } = await supabaseAuth
      .from('files')
      .select('id, filename, size_bytes, mime_type, created_at') // Select columns needed for listing
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (listError) {
      console.error(`Error listing files for user ${userId}:`, listError);
      return NextResponse.json({ success: false, error: `Failed to list files: ${listError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, files: files || [] });
  }
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("file_id");

  if (!fileId) {
    return NextResponse.json({ success: false, error: "file_id query parameter is required" }, { status: 400 });
  }

  // --- Authentication ---
  const supabaseAuth = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    console.error('Auth Error in DELETE /api/upload:', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = user.id;
  // --- End Authentication ---

  console.log(`Attempting to delete file with ID: ${fileId} for user: ${userId}`);
  const supabaseService = createServiceRoleClient(); // Use service role for DB/Storage deletions
  const bucketName = 'files';

  // 1. Fetch file metadata to get storage_path and verify ownership
  const { data: fileRecord, error: dbFetchError } = await supabaseService
    .from('files')
    .select('id, storage_path') // Select id to confirm record exists
    .eq('id', fileId)
    .eq('user_id', userId) // Verify ownership
    .single();

  if (dbFetchError) {
    // If error is 'PGRST116', file not found for user. Otherwise, it's a real error.
    const errorMessage = dbFetchError.code === 'PGRST116' ? "File not found or access denied." : `Database fetch failed: ${dbFetchError.message}`;
    const errorStatus = dbFetchError.code === 'PGRST116' ? 404 : 500;
    console.error(`Error fetching file record ${fileId} for delete:`, dbFetchError);
    return NextResponse.json({ success: false, error: errorMessage }, { status: errorStatus });
  }

  // 2. Attempt to remove file from Storage
  let storagePath = fileRecord?.storage_path;
  if (storagePath) {
    const { error: storageError } = await supabaseService.storage
      .from(bucketName)
      .remove([storagePath]);

    if (storageError) {
      // Log the error but proceed to delete the DB record anyway
      console.warn(`Failed to delete file ${storagePath} from storage (continuing DB delete):`, storageError);
    } else {
      console.log(`Successfully deleted file ${storagePath} from storage.`);
    }
  } else {
      console.warn(`File record ${fileId} had no storage_path. Skipping storage delete.`);
  }

  // 3. Delete record from Database
  const { error: dbDeleteError } = await supabaseService
    .from('files')
    .delete()
    .eq('id', fileId);
    // We already verified ownership with the fetch, so service role delete is okay here

  if (dbDeleteError) {
    console.error(`Failed to delete file record ${fileId} from database:`, dbDeleteError);
    // This is more critical, maybe the storage delete should be rolled back?
    // For now, just return an error.
    return NextResponse.json({ success: false, error: `Database delete failed: ${dbDeleteError.message}` }, { status: 500 });
  }

  console.log(`Successfully deleted file record ${fileId} from database.`);
  return NextResponse.json({ success: true });
}
