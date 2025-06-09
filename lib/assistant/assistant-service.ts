import { openai } from "@/lib/openai";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { type Assistant } from "openai/resources/beta/assistants";

type AssistantConfig = Database["public"]["Tables"]["assistants"]["Row"];

/**
 * Retrieves an OpenAI Assistant object using its corresponding database configuration ID.
 *
 * @param assistantId - The UUID of the assistant record in the public.assistants table.
 * @returns The OpenAI Assistant object.
 * @throws Error if the database record or OpenAI assistant cannot be found or retrieved.
 */
export async function getOpenaiAssistantByDbId(assistantId: string): Promise<Assistant> {
  const supabase = createServiceRoleClient();

  // 1. Fetch assistant config from DB by its primary key (UUID)
  console.log(`Fetching assistant config for DB ID: ${assistantId}`);
  const { data: assistantConfig, error: fetchError } = (await supabase
    .from("assistants")
    .select("id, name, openai_assistant_id, system_prompt") // Select necessary fields
    .eq("id", assistantId)
    .single()) as { data: AssistantConfig; error: any };

  if (fetchError || !assistantConfig) {
    console.error(`Error fetching assistant config for ID ${assistantId}:`, fetchError);
    const errorMessage =
      fetchError?.code === "PGRST116"
        ? `Assistant configuration with ID ${assistantId} not found in the database.`
        : `Failed to fetch assistant configuration: ${fetchError?.message || "Unknown error"}`;
    throw new Error(errorMessage);
  }

  const openaiAssistantId = assistantConfig.openai_assistant_id;
  const assistantName = assistantConfig.name; // For logging

  if (!openaiAssistantId) {
    console.error(`Assistant config ${assistantId} (${assistantName}) is missing its openai_assistant_id.`);
    // create a new assistant, pass system_prompt
    const assistant = await openai.beta.assistants.create({
      name: assistantName,
      instructions: assistantConfig.system_prompt,
      model: "gpt-4o",
    });

    // update the assistant config with the new assistant id
    await supabase.from("assistants").update({ openai_assistant_id: assistant.id }).eq("id", assistantId);

    return assistant;
  }

  // 2. Retrieve Assistant from OpenAI using the stored ID
  console.log(`Retrieving OpenAI assistant ${openaiAssistantId} for DB config ${assistantId} (${assistantName})`);
  try {
    const assistant = await openai.beta.assistants.retrieve(openaiAssistantId);
    return assistant;
  } catch (error: any) {
    console.error(`Failed to retrieve OpenAI assistant ${openaiAssistantId} (DB ID ${assistantId}):`, error);
    // Check if the error is specifically a 'not found' error from OpenAI
    if (error?.status === 404) {
      throw new Error(
        `OpenAI Assistant with ID ${openaiAssistantId} (linked to DB config ${assistantId}) not found on OpenAI.`,
      );
    }
    throw new Error(`Failed to retrieve OpenAI assistant ${openaiAssistantId}: ${error.message || "Unknown error"}`);
  }
}
