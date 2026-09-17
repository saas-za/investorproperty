import { NextResponse } from "next/server";
import { buildLandEmail, type DeveloperRecipient, type LandEmailInput } from "@/lib/server/land-email";
import { callerKey, rateLimited } from "@/lib/server/rate-limit";
import { sendViaResend } from "@/lib/server/resend";

export const runtime = "nodejs";

/**
 * Sends a land opportunity to a developer. Land opportunities live in the
 * page's own state (see `lib/crm/seed.ts` — same in-memory-POC pattern as
 * everywhere else in this codebase), so the property and recipient are
 * carried in the request rather than looked up server-side by id.
 *
 *   POST /api/land-email
 *   { "property": { ... }, "recipient": { "name", "language", "emails" } }
 */
export async function POST(request: Request) {
  if (rateLimited("land-email", callerKey(request), 20)) {
    return NextResponse.json({ error: "Too many requests — try again shortly" }, { status: 429 });
  }

  let body: { property?: LandEmailInput; recipient?: DeveloperRecipient };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const property = body.property;
  const recipient = body.recipient;

  if (!property?.name || !property.location || !Number.isFinite(property.areaM2)) {
    return NextResponse.json(
      { error: "property.name, property.location and property.areaM2 are required" },
      { status: 400 },
    );
  }
  if (!recipient?.emails?.length) {
    return NextResponse.json({ error: "recipient.emails is required" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validEmails = recipient.emails.filter((e) => emailRegex.test(e));
  if (validEmails.length === 0) {
    return NextResponse.json({ error: "No valid recipient email address" }, { status: 400 });
  }

  try {
    const { html, subject } = await buildLandEmail(property, {
      ...recipient,
      emails: validEmails,
    });
    const result = await sendViaResend({
      to: validEmails,
      subject,
      html,
      replyTo: "morne@investorproperty.co.za",
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not build that email" },
      { status: 500 },
    );
  }
}
