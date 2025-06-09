import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

type FileInsert = Database['public']['Tables']['files']['Insert'];

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const data = await request.formData();
  const file: File | null = data.get("file") as File;

  if (!file) {
    return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
  }

  // --- Authentication ---
  const supabaseAuth = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    console.error('Auth Error in POST /api/upload:', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = user.id;
  // --- End Authentication ---

  // --- Upload to Supabase Storage ---
  const supabaseService = createServiceRoleClient(); // Use service role for potential bucket policy bypass if needed, or strict RLS
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `public/${userId}/${Date.now()}-${file.name}`; // Unique path: public/{user_id}/{timestamp}-{filename}
  const bucketName = 'files'; // <<< Ensure this bucket exists in your Supabase project

  const { data: storageData, error: storageError } = await supabaseService.storage
    .from(bucketName)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false, // Don't upsert by default, treat as new file
    });

  if (storageError) {
    console.error("Supabase Storage upload error:", storageError);
    return NextResponse.json({ success: false, error: `Storage upload failed: ${storageError.message}` }, { status: 500 });
  }

  console.log(`File uploaded to Supabase Storage: ${storagePath}`, storageData);
  // --- End Upload ---

  // --- Insert into Database ---
  const fileMetadata: FileInsert = {
    user_id: userId,
    filename: file.name,
    storage_path: storagePath, // Save the path used for upload
    mime_type: file.type,
    size_bytes: file.size,
    // metadata: {} // Add any other relevant metadata if needed
  };

  const { data: dbData, error: dbError } = await supabaseService
    .from('files')
    .insert(fileMetadata)
    .select('id') // Return the ID of the new DB record
    .single();

  if (dbError) {
    console.error("Supabase DB insert error:", dbError);
    // Attempt to clean up the orphaned storage file if DB insert fails
    console.log(`Attempting to delete orphaned file from storage: ${storagePath}`);
    await supabaseService.storage.from(bucketName).remove([storagePath]);
    return NextResponse.json({ success: false, error: `Database insert failed: ${dbError.message}` }, { status: 500 });
  }
  // --- End Insert ---

  return NextResponse.json({
    success: true,
    fileId: dbData.id, // Return the database record ID
  });
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
