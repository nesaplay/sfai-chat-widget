import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { assistantStorage, threadStorage } from "@/lib/assistant/assistant-service";

interface Message {
  id: string;
  content: string;
  type: "user" | "assistant";
  completed?: boolean;
  newSection?: boolean;
}

// Memory storage using a global variable (this persists between requests in development)
let stateMessages: Message[] = [];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const init = searchParams.get("init");
  const assistantId = searchParams.get("assistantId") as string;
  const threadId = `thread-${assistantId}`;

  const assistant = assistantStorage.get(assistantId);
  const thread = threadStorage.get(threadId);

  if (init) {
    if (assistant && thread) {
      const messages = await openai.beta.threads.messages.list(thread);
      stateMessages = messages.data.reverse().map((message) => ({
        id: message.id,
        content: message.content[0].type === "text" ? message.content[0].text.value : "",
        type: message.role as "user" | "assistant",
        completed: true,
        newSection: message.role === "user",
      }));
    } else {
      stateMessages = [];
    }
  }

  try {
    return NextResponse.json({ messages: stateMessages });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const message = await request.json();
    stateMessages.push(message);

    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    stateMessages = [];
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to clear messages" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { messages } = await request.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages must be an array" }, { status: 400 });
    }

    stateMessages = messages;
    return NextResponse.json({ success: true, messages: stateMessages });
  } catch (error) {
    return NextResponse.json({ error: "Failed to set initial messages" }, { status: 500 });
  }
}
