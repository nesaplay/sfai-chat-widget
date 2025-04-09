import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { getFileFromTmp } from "@/lib/storage/tmp-file-service";
import { getOrCreateAssistant, getOrCreateThread } from "@/lib/assistant/assistant-service";

export async function POST(request: Request) {
  const startTime = performance.now();
  console.log("Starting chat stream processing...");

  try {
    const { message, filename, labelData, assistantName, assistantId, instructions } = await request.json();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    let fileId;
    let content = message;

    // Use default keys if not provided
    const effectiveAssistantKey = assistantId || "assistant-default";
    const effectiveThreadKey = `thread-${effectiveAssistantKey}`;
    const effectiveInstructions = instructions || "";

    if (filename) {
      const fileStartTime = performance.now();
      const fileData = await getFileFromTmp(filename);
      if (fileData) {
        const file = await openai.files.create({
          file: new File([fileData.buffer], fileData.metadata.name, {
            type: fileData.metadata.type,
            lastModified: fileData.metadata.lastModified,
          }),
          purpose: "assistants",
        });
        fileId = file.id;
      }
      console.log(`File processing took: ${(performance.now() - fileStartTime).toFixed(2)}ms`);
    }

    (async () => {
      try {
        // 1. Assistant
        const assistantStartTime = performance.now();
        const assistant = await getOrCreateAssistant(
          effectiveAssistantKey,
          assistantName,
          effectiveInstructions,
          "gpt-4o",
          [{ type: "code_interpreter" }],
          fileId ? [fileId] : undefined,
        );

        console.log(`Assistant setup took: ${(performance.now() - assistantStartTime).toFixed(2)}ms`);

        // 2. Thread
        const threadStartTime = performance.now();
        const thread = await getOrCreateThread(effectiveThreadKey);
        console.log(`Thread setup took: ${(performance.now() - threadStartTime).toFixed(2)}ms`);

        if (labelData) {
          content = message + `\n\nData for context: ${JSON.stringify(labelData, null, 2)}`;
        }

        // 3. User Message
        const messageStartTime = performance.now();
        console.log("Sending a message");
        await openai.beta.threads.messages.create(thread.id, {
          role: "user",
          content,
          ...(fileId ? { attachments: [{ file_id: fileId, tools: [{ type: "code_interpreter" }] }] } : {}),
        });

        const run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: assistant.id,
        });

        let status;
        let pollCount = 0;

        do {
          await new Promise((r) => setTimeout(r, 2000));
          status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
          pollCount++;
        } while (status.status !== "completed");

        console.log(`Message processing took: ${(performance.now() - messageStartTime).toFixed(2)}ms`);
        console.log(`Number of status polls: ${pollCount}`);

        const responseStartTime = performance.now();
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0]; // Most recent message first

        console.log("Received a message");

        if (lastMessage && lastMessage.content && lastMessage.content.length > 0) {
          if (lastMessage.content[0].type === "text") {
            const text = lastMessage.content[0].text.value;
            const words = text.split(" ");

            for (const word of words) {
              await new Promise((resolve) => setTimeout(resolve, 40));
              await writer.write(encoder.encode(word + " "));
            }
          }
        } else {
          await writer.write(encoder.encode("Sorry, I didn't understand your request. Please try again."));
        }
        console.log(`Response streaming took: ${(performance.now() - responseStartTime).toFixed(2)}ms`);
      } catch (error) {
        console.error("OpenAI streaming error:", error);
        await writer.write(encoder.encode("Sorry, an error occurred while processing your request."));
      } finally {
        await writer.close();
        console.log(`Total execution time: ${(performance.now() - startTime).toFixed(2)}ms`);
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.log(`Failed execution time: ${(performance.now() - startTime).toFixed(2)}ms`);
    return NextResponse.json({ error: "Failed to process streaming message" }, { status: 500 });
  }
}
