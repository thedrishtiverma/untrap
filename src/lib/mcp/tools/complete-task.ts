import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "complete_roadmap_task",
  title: "Mark a roadmap task complete",
  description:
    "Mark a UNTRAP roadmap task as completed (or uncompleted) for the signed-in student.",
  inputSchema: {
    task_id: z.string().uuid().describe("The roadmap task UUID."),
    completed: z.boolean().default(true).describe("True to complete, false to reopen."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ task_id, completed }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase
      .from("roadmap_tasks")
      .update({ completed })
      .eq("id", task_id)
      .eq("user_id", ctx.getUserId());
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Task ${task_id} → completed=${completed}` }] };
  },
});
