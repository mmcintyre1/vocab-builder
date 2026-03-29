import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { checkPin, getPinFromRequest } from "@/lib/auth";

// PATCH /api/cards/[id] — edit card front/back
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const update: Record<string, string> = {};
  if (typeof body.front === "string") update.front = body.front.trim();
  if (typeof body.back === "string") update.back = body.back.trim();

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("cards")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
