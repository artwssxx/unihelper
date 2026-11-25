import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/server/auth";
import { launchCard } from "@/lib/server/proLaunch";
import { supabaseAdmin } from "@/lib/server/supabase";

const MAX_BYTES = 3 * 1024 * 1024;

function receiptType(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "image/png";
  if (bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))) return "image/jpeg";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin()!.from("pro_launch_payments")
    .select("status,access_until").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ card: launchCard(), payment: data });
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!launchCard()) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const claimedSize = Number(req.headers.get("content-length"));
  if (claimedSize > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
  const reader = req.body?.getReader();
  if (!reader) return NextResponse.json({ error: "invalid_image" }, { status: 400 });

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: "too_large" }, { status: 413 });
      }
      chunks.push(value);
    }
  } catch {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }
  const bytes = Buffer.concat(chunks, size);
  const type = receiptType(bytes);
  if (!type) return NextResponse.json({ error: "invalid_image" }, { status: 400 });

  const { data, error } = await supabaseAdmin()!.rpc("submit_pro_launch_payment", {
    buyer: user.id,
    image: bytes.toString("base64"),
    image_hash: createHash("sha256").update(bytes).digest("hex"),
    image_type: type,
  });
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (data === "duplicate" || data === "active") return NextResponse.json({ error: data }, { status: 409 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
