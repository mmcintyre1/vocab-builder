import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { checkPin, getPinFromRequest } from "@/lib/auth";
import { DEFAULT_SYSTEM_PROMPT, FIELD_SPECS, EntryType } from "@/lib/cards/prompts";

const ENTRY_TYPES: EntryType[] = ["word", "concept", "reference"];
const MAX_FIELD_LEN = 300;
const MAX_SYSTEM_LEN = 1000;

// GET /api/settings/prompts — effective prompt config (built-in default + any stored override)
export async function GET(request: NextRequest) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("prompt_settings").select("key, value");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: { key: string; value: Record<string, string> }[] = data ?? [];
  const systemRow = rows.find((r) => r.key === "system");

  const result: Record<string, unknown> = {
    system: { default: DEFAULT_SYSTEM_PROMPT, custom: systemRow?.value?.text ?? null },
  };

  for (const entryType of ENTRY_TYPES) {
    const fieldsRow = rows.find((r) => r.key === `fields:${entryType}`);
    const custom = fieldsRow?.value ?? {};
    result[entryType] = Object.fromEntries(
      FIELD_SPECS[entryType].map((spec) => [
        spec.key,
        { label: spec.label, default: spec.instruction, custom: custom[spec.key] ?? null },
      ])
    );
  }

  return NextResponse.json(result);
}

// PATCH /api/settings/prompts — save global overrides
// Body: { system?: string, word?: Record<string,string>, concept?: Record<string,string>, reference?: Record<string,string> }
// An empty/whitespace value for a field clears that override (reverts to default).
export async function PATCH(request: NextRequest) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (typeof body.system === "string") {
    const text = body.system.trim().slice(0, MAX_SYSTEM_LEN);
    if (text) {
      await supabase
        .from("prompt_settings")
        .upsert({ key: "system", value: { text }, updated_at: new Date().toISOString() }, { onConflict: "key" });
    } else {
      await supabase.from("prompt_settings").delete().eq("key", "system");
    }
  }

  for (const entryType of ENTRY_TYPES) {
    const patch = body[entryType];
    if (!patch || typeof patch !== "object") continue;

    const validKeys = new Set(FIELD_SPECS[entryType].map((s) => s.key));
    const { data: existing } = await supabase
      .from("prompt_settings")
      .select("value")
      .eq("key", `fields:${entryType}`)
      .maybeSingle();

    const merged: Record<string, string> = { ...(existing?.value ?? {}) };
    for (const [key, value] of Object.entries(patch)) {
      if (!validKeys.has(key) || typeof value !== "string") continue;
      const trimmed = value.trim().slice(0, MAX_FIELD_LEN);
      if (trimmed) merged[key] = trimmed;
      else delete merged[key];
    }

    if (Object.keys(merged).length > 0) {
      await supabase
        .from("prompt_settings")
        .upsert({ key: `fields:${entryType}`, value: merged, updated_at: new Date().toISOString() }, { onConflict: "key" });
    } else {
      await supabase.from("prompt_settings").delete().eq("key", `fields:${entryType}`);
    }
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/settings/prompts — reset to built-in default
// Body: { scope: "system" }
//    or { scope: "fields", entryType } — resets every field for that type
//    or { scope: "fields", entryType, field } — resets just that one field
export async function DELETE(request: NextRequest) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (body.scope === "system") {
    await supabase.from("prompt_settings").delete().eq("key", "system");
  } else if (body.scope === "fields" && ENTRY_TYPES.includes(body.entryType)) {
    if (typeof body.field === "string") {
      const { data: existing } = await supabase
        .from("prompt_settings")
        .select("value")
        .eq("key", `fields:${body.entryType}`)
        .maybeSingle();

      const next: Record<string, string> = { ...(existing?.value ?? {}) };
      delete next[body.field];

      if (Object.keys(next).length > 0) {
        await supabase
          .from("prompt_settings")
          .upsert({ key: `fields:${body.entryType}`, value: next, updated_at: new Date().toISOString() }, { onConflict: "key" });
      } else {
        await supabase.from("prompt_settings").delete().eq("key", `fields:${body.entryType}`);
      }
    } else {
      await supabase.from("prompt_settings").delete().eq("key", `fields:${body.entryType}`);
    }
  } else {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
