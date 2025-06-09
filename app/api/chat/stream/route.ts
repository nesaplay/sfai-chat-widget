import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { getOpenaiAssistantByDbId } from "@/lib/assistant/assistant-service";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];
type ThreadInsert = Database["public"]["Tables"]["threads"]["Insert"];

// --- Get the Predefined Widget User ID ---
const chatWidgetUserId = process.env.CHAT_WIDGET_USER_ID;
// --- End Widget User ID ---

export async function POST(request: Request) {
  // Check for the environment variable inside the request handler
  if (!chatWidgetUserId) {
    console.error("POST /api/chat/stream Error: CHAT_WIDGET_USER_ID environment variable is not set.");
    return NextResponse.json({ error: "Server configuration error: Widget user not configured." }, { status: 500 });
  }

  const startTime = performance.now();
  console.log("Starting chat stream processing...");

  let requestData;
  let request_thread_id: string | undefined;
  let db_thread_id: string;
  let openai_thread_id: string | undefined;
  let assistantId: string;
  let newThreadCreated = false;

  try {
    requestData = await request.json();
    const { message, filename, hiddenMessage, context } = requestData;
    request_thread_id = requestData.thread_id;
    assistantId = requestData.assistantId;

    if (!message || !assistantId) {
      return NextResponse.json({ error: "Missing required fields: message, assistantId" }, { status: 400 });
    }

    // --- Authentication Removed ---
    const userId = chatWidgetUserId; // Use the predefined ID
    console.log(`POST Stream: Acting as predefined Widget User: ${userId}`);
    // --- End Authentication Removal ---

    const supabaseService = createServiceRoleClient();

    // --- Determine Thread ID (Existing or New) ---
    if (request_thread_id) {
      // --- Use Existing Thread ---
      db_thread_id = request_thread_id;
      console.log(`POST Stream: Using provided DB thread ID: ${db_thread_id} for user ${userId}`);
      // --- Verify Thread Ownership ---
      const { data: threadData, error: threadFetchError } = await supabaseService
        .from("threads")
        .select("metadata, user_id") // Select user_id for check
        .eq("id", db_thread_id)
        // .eq("user_id", userId) // Check directly
        .maybeSingle(); // Use maybeSingle

      if (threadFetchError) {
        console.error(`POST Stream: Error fetching thread ${db_thread_id} for user ${userId}:`, threadFetchError);
        // Differentiate between DB error and not found
        return NextResponse.json({ error: "Failed to verify thread existence." }, { status: 500 });
      }

      // Check if thread exists and belongs to the user
      if (!threadData || threadData.user_id !== userId) {
        console.warn(`POST Stream: Provided thread ${db_thread_id} not found or not owned by widget user ${userId}.`);
        const status = !threadData ? 404 : 403; // 404 if not found, 403 if wrong user
        const errorMsg = !threadData ? "Thread not found" : "Access denied to thread";
        return NextResponse.json({ error: errorMsg }, { status });
      }
      console.log(`POST Stream: Verified ownership of thread ${db_thread_id} for user ${userId}.`);
      // --- End Ownership Check ---

      openai_thread_id = (threadData?.metadata as any)?.openai_thread_id as string | undefined;

      if (!openai_thread_id) {
        console.log(`POST Stream: No OpenAI thread ID found for existing DB thread ${db_thread_id}. Creating new OpenAI thread.`);
        const newOpenaiThread = await openai.beta.threads.create();
        openai_thread_id = newOpenaiThread.id;

        const currentMetadata =
          typeof threadData?.metadata === "object" && threadData.metadata !== null ? threadData.metadata : {};
        const newMetadata = { ...currentMetadata, openai_thread_id: openai_thread_id };
        const { error: updateError } = await supabaseService
          .from("threads")
          .update({ metadata: newMetadata })
          .eq("id", db_thread_id)
          .eq("user_id", userId); // Ensure update targets the correct user's thread

        if (updateError) {
          console.error(
            `POST Stream: Failed to update thread ${db_thread_id} with OpenAI thread ID ${openai_thread_id}:`,
            updateError,
          );
          return NextResponse.json(
            { error: "Failed to associate OpenAI thread with database thread." },
            { status: 500 },
          );
        }
        console.log(`POST Stream: Associated OpenAI thread ${openai_thread_id} with DB thread ${db_thread_id}`);

      } else {
        console.log(`POST Stream: Using existing OpenAI thread ${openai_thread_id} for DB thread ${db_thread_id}`);
      }
      // --- End Existing Thread Handling ---
    } else {
      // --- Create New Thread ---
      newThreadCreated = true;
      console.log(`POST Stream: No thread_id provided. Creating new DB and OpenAI threads for user ${userId}.`);

      // 1. Create OpenAI Thread first
      const newOpenaiThread = await openai.beta.threads.create();
      openai_thread_id = newOpenaiThread.id;
      console.log(`POST Stream: Created new OpenAI thread: ${openai_thread_id}`);

      // 2. Create DB Thread record, linking assistant_id and the correct user_id
      const newDbThreadData: ThreadInsert = {
        user_id: userId, // Use the predefined widget user ID
        assistant_id: assistantId,
        metadata: { openai_thread_id: openai_thread_id },
        // Add title generation logic if needed
      };
      const { data: createdDbThread, error: dbCreateError } = await supabaseService
        .from("threads")
        .insert(newDbThreadData)
        .select("id")
        .single();

      if (dbCreateError || !createdDbThread) {
        console.error(`POST Stream: Failed to create new DB thread record for user ${userId}:`, dbCreateError);
        // Attempt cleanup?
        return NextResponse.json({ error: "Failed to create new thread in database." }, { status: 500 });
      }

      db_thread_id = createdDbThread.id;
      console.log(`POST Stream: Created new DB thread ${db_thread_id} associated with OpenAI thread ${openai_thread_id} for user ${userId}`);
      // --- End Create New Thread ---
    }
    // --- End Thread ID Determination ---

    // --- Save User Message to DB (unless hiddenMessage is true) ---
    if (!hiddenMessage) {
      const userMessageToInsert: MessageInsert = {
        thread_id: db_thread_id,
        user_id: userId, // Use predefined widget user ID
        role: "user",
        content: message,
        completed: true,
        assistant_id: null,
      };
      const { error: insertUserMsgError } = await supabaseService.from("messages").insert(userMessageToInsert);

      if (insertUserMsgError) {
        console.error(`POST Stream: Supabase user message insert error for user ${userId}:`, insertUserMsgError);
        return NextResponse.json(
          { error: `Failed to save user message: ${insertUserMsgError.message}` },
          { status: 500 },
        );
      }
      console.log(`POST Stream: Saved user message to DB for user ${userId}, thread ${db_thread_id}`);
    }
    // --- End Save User Message ---

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    let fileId = undefined;
    let openaiFileId = undefined;
    if (filename) {
      fileId = filename;
      console.log(`POST Stream: Processing request with DB file ID: ${fileId} for user ${userId}`);
      const fileStartTime = performance.now();
      // --- Verify File Ownership ---
      const { data: fileRecord, error: fileFetchError } = await supabaseService
        .from("files")
        .select("storage_path, filename, mime_type, user_id") // Select user_id
        .eq("id", fileId)
        // .eq("user_id", userId) // Check directly
        .maybeSingle();

      if (fileFetchError) {
        console.error(`POST Stream: Error fetching file record ${fileId} for user ${userId}:`, fileFetchError);
        return NextResponse.json({ error: "Failed to verify file existence." }, { status: 500 });
      }

      if (!fileRecord || fileRecord.user_id !== userId) {
        console.warn(`POST Stream: File ${fileId} not found or not owned by widget user ${userId}.`);
        const status = !fileRecord ? 404 : 403;
        const errorMsg = !fileRecord ? "File not found" : "Access denied to file";
        return NextResponse.json({ error: errorMsg }, { status });
      }
      console.log(`POST Stream: Verified ownership of file ${fileId} for user ${userId}.`);
      // --- End File Ownership Check ---

      if (!fileRecord.storage_path) {
          console.error(`POST Stream: Missing storage path for file ID ${fileId}.`);
          return NextResponse.json({ error: "File record is incomplete." }, { status: 500 });
      }

      // Note: Storage download might still use RLS based on the *authenticated* user
      // if using the standard client. Using service client for storage requires
      // different setup or careful handling. Let's assume RLS allows the service
      // role (or the specific widget user if RLS is set up for it) to download.
      // If storage uses RLS that strictly requires the logged-in user from cookies,
      // this download part might fail. Consider adjusting storage RLS.
      const { data: blob, error: downloadError } = await supabaseService.storage // Using service client storage
        .from("files") // Bucket name
        .download(fileRecord.storage_path);

      if (downloadError || !blob) {
        console.error(`POST Stream: Failed to download file ${fileRecord.storage_path} from storage for user ${userId}:`, downloadError);
        return NextResponse.json({ error: "Failed to download attached file data." }, { status: 500 });
      }

      const openaiFile = await openai.files.create({
        file: new File([blob], fileRecord.filename || `file_${fileId}`, {
          type: fileRecord.mime_type || "application/octet-stream",
        }),
        purpose: "assistants",
      });
      openaiFileId = openaiFile.id;
      console.log(
        `POST Stream: File processing took: ${(performance.now() - fileStartTime).toFixed(2)}ms. OpenAI File ID: ${openaiFileId}`,
      );
    }

    // --- OpenAI Interaction (Async IIFE) ---
    (async () => {
      try {
        // ... (Get Assistant logic remains mostly the same, relies on assistantId)
        const assistantStartTime = performance.now();
        const assistant = await getOpenaiAssistantByDbId(assistantId);
        console.log(`POST Stream: Assistant setup took: ${(performance.now() - assistantStartTime).toFixed(2)}ms`);

        // Fetch assistant user_prompt (using service client)
        const { data: assistantData, error: assistantFetchError } = await supabaseService
          .from('assistants')
          .select('user_prompt')
          .eq('id', assistantId)
          .maybeSingle(); // Use maybeSingle

        if (assistantFetchError) {
            console.error(`POST Stream: Error fetching assistant data for ${assistantId}:`, assistantFetchError);
            // Handle error appropriately, maybe write error to stream
            await writer.write(encoder.encode(`data: ${JSON.stringify({ error: "Failed to fetch assistant configuration." })}\n\n`));
            await writer.close();
            return;
        }
          
        const userPrompt = assistantData?.user_prompt;

        const messageWithContext = context ? `${message}\n\nCONTEXT:${JSON.stringify(context)}` : message;
        const messageToSend = userPrompt ? `${userPrompt}\n\n${messageWithContext}` : messageWithContext;

        // ... (Add message to OpenAI thread)
        await openai.beta.threads.messages.create(openai_thread_id!, {
          role: "user",
          content: messageToSend,
          ...(openaiFileId ? { attachments: [{ file_id: openaiFileId, tools: [{ type: "code_interpreter" }] }] } : {}),
        });

        // ... (Create Run)
        const run = await openai.beta.threads.runs.create(openai_thread_id!, {
          assistant_id: assistant.id,
        });

        // Write initial data (thread_id, run_id, potentially newThreadCreated flag)
        // Commenting out this line to only stream the final message content
        /*
        await writer.write(
            encoder.encode(`data: ${JSON.stringify({ db_thread_id, run_id: run.id, new_thread_created: newThreadCreated })}\n\n`),
        );
        */

        // ... (Polling logic remains the same)
        let status;
        let pollCount = 0;
        const maxPolls = 30; // Add a max poll count to prevent infinite loops
        const pollInterval = 1500; // ms

        do {
          if (pollCount >= maxPolls) {
            console.error(`POST Stream: Max polling attempts (${maxPolls}) reached for run ${run.id}.`);
            throw new Error("Assistant run timed out.");
          }
          await new Promise((r) => setTimeout(r, pollInterval));
          status = await openai.beta.threads.runs.retrieve(openai_thread_id!, run.id);
          pollCount++;
          // Optionally send status updates to the client if needed
          // await writer.write(encoder.encode(`data: ${JSON.stringify({ status: status.status })}\n\n`));
        } while (status.status !== "completed" && status.status !== "failed" && status.status !== "cancelled" && status.status !== "expired");

        console.log(`POST Stream: Run ${run.id} finished with status ${status.status} after ${pollCount} polls.`);

        if (status.status !== "completed") {
          console.error(`POST Stream: OpenAI run ${run.id} failed with status: ${status.status}`, status.last_error);
          throw new Error(`Assistant run failed: ${status.last_error?.message || status.status}`);
        }

        // ... (List messages) - Fetch in descending order
        const responseStartTime = performance.now();
        const messages = await openai.beta.threads.messages.list(openai_thread_id!, { order: 'desc' }); // Get in descending order

        // Find the latest assistant message in the thread, assuming it's the result of the completed run.
        const lastMessage = messages.data.find(msg => msg.role === 'assistant');

        console.log(`POST Stream: OpenAI message list (desc) took: ${(performance.now() - responseStartTime).toFixed(2)}ms`);

        // Add more detailed logging before the check
        console.log("POST Stream: Raw messages received from OpenAI (desc):"); // Log the raw data
        // Avoid logging potentially huge message list repeatedly if it fails often.
        // Consider logging only on error or first few messages.
        // console.log(JSON.stringify(messages.data, null, 2));
        console.log("POST Stream: Latest assistant message found (by role='assistant', order='desc'):", JSON.stringify(lastMessage, null, 2));


        if (!lastMessage || lastMessage.content[0]?.type !== "text") {
          let detail = "No assistant message found after run.";
          if (lastMessage) {
              detail = `Last assistant message content type was not 'text'. Type: ${lastMessage.content[0]?.type}. Content: ${JSON.stringify(lastMessage.content)}`;
          }
          // Log the full raw list only on error now
          console.error(`POST Stream: ${detail}. Raw messages:`, JSON.stringify(messages.data, null, 2));
          throw new Error(`No valid text response received from assistant. Detail: ${detail}`);
        }

        const assistantContent = lastMessage.content[0].text.value;
        console.log("POST Stream: Received assistant message content. Attempting to stream raw content to client...");

        // Stream the final message content FIRST - sending raw string followed by newline
        await writer.write(encoder.encode(assistantContent + '\n')); // Send raw string + newline
        console.log("POST Stream: Successfully wrote raw content + newline to stream.");

        // --- Save Assistant Message to DB (AFTER streaming) ---
        try {
          const assistantMessageToInsert: MessageInsert = {
            thread_id: db_thread_id,
              user_id: null, // Assistant messages should NOT have a user_id
            role: "assistant",
            content: assistantContent,
            completed: true,
              assistant_id: assistantId, // Link to the assistant used
              metadata: { openai_message_id: lastMessage.id, openai_run_id: run.id }
          };
          const { error: insertAssistantMsgError } = await supabaseService
            .from("messages")
            .insert(assistantMessageToInsert);

          if (insertAssistantMsgError) {
              console.error(
                `POST Stream: Supabase assistant message insert error (after streaming) for user ${userId}, thread ${db_thread_id}:`,
                insertAssistantMsgError,
              );
              // Logged the error, but response was already sent.
            } else {
                 console.log(`POST Stream: Successfully saved assistant message to DB for thread ${db_thread_id}`);
            }
        } catch (dbSaveError) {
            console.error(
                `POST Stream: Exception during Supabase assistant message insert (after streaming) for user ${userId}, thread ${db_thread_id}:`,
                dbSaveError,
            );
        }
        // --- End Save Assistant Message ---

      } catch (error: any) {
        console.error("POST Stream: Error during OpenAI interaction or DB saving:", error);
        // Removing the write call here - if an error occurs, the stream will just close without sending error data.
        /*
        try {
          // Attempt to send error details to the client via the stream
          const errorMessage = error.message || "An unexpected error occurred during processing.";
          await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
        } catch (writeError) {
          console.error("POST Stream: Failed to write error to stream:", writeError);
        }
        */
      } finally {
        // Ensure the writer is closed regardless of success or failure
        try {
          await writer.close();
        } catch (closeError) {
          console.error("POST Stream: Error closing stream writer:", closeError);
          }
        const endTime = performance.now();
        console.log(`Stream processing finished. Total time: ${(endTime - startTime).toFixed(2)}ms`);
      }
    })(); // End async IIFE

    // Return the stream response immediately
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

  } catch (error: any) {
    // Catch errors from initial request parsing or setup before the stream starts
    console.error("POST Stream: Top-level error before starting stream:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
