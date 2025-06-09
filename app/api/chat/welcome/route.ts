import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Database } from '@/types/supabase';

type Thread = Database['public']['Tables']['threads']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type Assistant = Database['public']['Tables']['assistants']['Row'];

// --- Get the Predefined Widget User ID ---
const chatWidgetUserId = process.env.CHAT_WIDGET_USER_ID;
// --- End Widget User ID ---

export async function POST(request: Request) {
    // Check for the environment variable inside the request handler
    if (!chatWidgetUserId) {
        console.error("POST /api/chat/welcome Error: CHAT_WIDGET_USER_ID environment variable is not set.");
        return NextResponse.json({ error: "Server configuration error: Widget user not configured." }, { status: 500 });
    }

    // Removed cookieStore
    let requestData;

    try {
        requestData = await request.json();
    } catch (e) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { assistantId } = requestData;

    if (!assistantId) {
        return NextResponse.json({ error: "Missing required field: assistantId" }, { status: 400 });
    }

    // --- Authentication Removed ---
    const userId = chatWidgetUserId; // Use the predefined ID
    console.log(`POST Welcome: Acting as predefined Widget User: ${userId} for Assistant: ${assistantId}`);
    // --- End Authentication Removal ---

    const supabaseService = createServiceRoleClient();

    try {
        // 0. Fetch Assistant's Welcome Message
        console.log(`POST Welcome: Fetching welcome message for assistant ${assistantId}`);
        const { data: assistantData, error: assistantError } = await supabaseService
            .from('assistants')
            .select('welcome_message')
            .eq('id', assistantId)
            .single();

        if (assistantError || !assistantData) {
             console.error(`POST Welcome: Assistant fetch error for ID ${assistantId}:`, assistantError);
             return NextResponse.json({ error: `Failed to fetch assistant details: ${assistantError?.message || 'Assistant not found'}` }, { status: 404 });
        }

        const welcomeMessageContent = assistantData.welcome_message as unknown;
        // Use the first message if it's an array, otherwise check if it's a non-empty string
        let firstWelcomeMessage: string | null = null;
        if (Array.isArray(welcomeMessageContent) && welcomeMessageContent.length > 0 && typeof welcomeMessageContent[0] === 'string' && welcomeMessageContent[0].trim().length > 0) {
            firstWelcomeMessage = welcomeMessageContent[0].trim(); // Trim the element if it's a string
        } else if (typeof welcomeMessageContent === 'string' && welcomeMessageContent.trim().length > 0) {
            firstWelcomeMessage = welcomeMessageContent.trim();
        }

        if (!firstWelcomeMessage) {
            console.warn(`POST Welcome: Assistant ${assistantId} has no valid welcome message configured.`);
            // Perhaps return a success but indicate no message was seeded?
            // Or fail if a welcome message is strictly required?
            // Let's proceed but log it clearly. We could potentially create the thread without the message.
            // For now, let's return an error as the original code expected a message.
            return NextResponse.json({ error: `Assistant ${assistantId} does not have a valid welcome message.` }, { status: 400 });
        }

        // 1. Create the new thread for the widget user
        console.log(`POST Welcome: Creating new thread for user ${userId}, assistant ${assistantId}`);
        const { data: newThread, error: threadError } = await supabaseService
            .from('threads')
            .insert({
                user_id: userId, // Use predefined widget user ID
                assistant_id: assistantId,
                // Consider generating a better default title?
                title: 'New Chat' // Changed default title
            })
            .select()
            .single();

        if (threadError || !newThread) {
            console.error(`POST Welcome: Supabase create thread error for user ${userId}:`, threadError);
            return NextResponse.json({ error: `Failed to create thread: ${threadError?.message || 'Unknown error'}` }, { status: 500 });
        }

        console.log(`POST Welcome: Created new thread ${newThread.id} for user ${userId}`);

        // 2. Insert the fetched welcome message into the new thread
        const messageToInsert = {
            thread_id: newThread.id,
            user_id: userId, // Associate message with the user
            assistant_id: assistantId,
            role: "assistant" as const,
            content: firstWelcomeMessage, // Use the validated message
            completed: true,
            metadata: null, // Or add specific metadata if needed
        };

        console.log(`POST Welcome: Inserting welcome message into thread ${newThread.id}`);

        const { data: newMessage, error: messageError } = await supabaseService
            .from("messages")
            .insert(messageToInsert)
            .select()
            .single();

        if (messageError || !newMessage) {
            console.error(`POST Welcome: Supabase insert welcome message error for thread ${newThread.id}:`, messageError);
            // Should we delete the created thread if message insertion fails?
            return NextResponse.json({ error: `Failed to save welcome message: ${messageError?.message || 'Unknown error'}` }, { status: 500 });
        }

        console.log(`POST Welcome: Successfully created thread ${newThread.id} and seeded welcome message ${newMessage.id}`);
        // Return both the new thread and the message
        return NextResponse.json({ thread: newThread as Thread, message: newMessage as Message }, { status: 201 });

    } catch (error: any) {
        console.error(`POST Welcome: Unexpected error for user ${userId}, assistant ${assistantId}:`, error);
        return NextResponse.json({ error: "An unexpected error occurred during welcome setup" }, { status: 500 });
    }
} 