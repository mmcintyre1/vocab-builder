import { supabase } from "@/lib/supabase/client";
import { PromptOverrides } from "./generate";
import { EntryType } from "./prompts";

// Reads the persisted global overrides (Settings page) for an entry type.
// Returns undefined fields where nothing's been customized — generateWordData
// falls back to the built-in defaults in that case.
export async function getGlobalOverrides(entryType: EntryType): Promise<PromptOverrides> {
  const { data } = await supabase
    .from("prompt_settings")
    .select("key, value")
    .in("key", ["system", `fields:${entryType}`]);

  const rows: { key: string; value: Record<string, string> }[] = data ?? [];
  const systemRow = rows.find((r) => r.key === "system");
  const fieldsRow = rows.find((r) => r.key === `fields:${entryType}`);

  return {
    systemPrompt: systemRow?.value?.text,
    fields: fieldsRow?.value,
  };
}

// Request-level overrides (per-add "customize prompt" panel) win field-by-field
// over the persisted global default, which wins over the built-in default.
export function mergeOverrides(base: PromptOverrides, request?: PromptOverrides): PromptOverrides {
  return {
    systemPrompt: request?.systemPrompt || base.systemPrompt,
    fields: { ...base.fields, ...request?.fields },
  };
}
