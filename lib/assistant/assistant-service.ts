import { openai } from "@/lib/openai";

// Store assistants and threads in memory
export const assistantStorage = new Map<string, string>();
export const threadStorage = new Map<string, string>();

/**
 * Creates or retrieves an assistant
 * @param assistantKey - Unique key to identify the assistant
 * @param name - Name of the assistant
 * @param instructions - Instructions for the assistant
 * @param model - Model to use for the assistant
 * @param tools - Tools to use for the assistant
 * @param fileIds - Optional file IDs to attach to the assistant
 * @returns The assistant object
 */
export async function getOrCreateAssistant(
  assistantKey: string,
  name: string,
  instructions: string,
  model: string,
  tools: any[],
  fileIds?: string[]
) {
  if (assistantStorage.get(assistantKey)) {
    return await openai.beta.assistants.retrieve(assistantStorage.get(assistantKey)!);
  } else {
    const assistant = await openai.beta.assistants.create({
      name,
      instructions,
      model,
      tools,
      ...(fileIds && fileIds.length > 0
        ? {
            tool_resources: {
              code_interpreter: {
                file_ids: fileIds,
              },
            },
          }
        : {}),
    });

    assistantStorage.set(assistantKey, assistant.id);
    return assistant;
  }
}

/**
 * Creates or retrieves a thread
 * @param threadKey - Unique key to identify the thread
 * @returns The thread object
 */
export async function getOrCreateThread(threadKey: string) {
  if (threadStorage.get(threadKey)) {
    return await openai.beta.threads.retrieve(threadStorage.get(threadKey)!);
  } else {
    const thread = await openai.beta.threads.create();
    threadStorage.set(threadKey, thread.id);
    return thread;
  }
} 