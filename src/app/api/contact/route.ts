import { NextResponse } from "next/server";
import { callerKey, rateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const TO = "morne@investorproperty.co.za";

/**
 * The enquiry form on the estimate.
 *
 * Deliberately carries only what the person typed. The site figures they were
 * looking at are not sent and are not stored — the page says so, and that
 * promise is worth more than the extra context would be.
 */
export async function POST(request: Request) {
  // Low ceiling: a human sends one of these, not six a minute.
  if (rateLimited("contact", callerKey(request), 5)) {
    return NextResponse.json(
      { error: "That's already been sent — give it a minute" },
      { status: 429 },
    );
  }

  let body: { name?: string; email?: string; phone?: string; message?: string; context?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const message = (body.message ?? "").trim();
  const phone = (body.phone ?? "").trim();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email and message are required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That email address doesn't look right" }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "That message is too long" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;

  // Without a key configured the form still has to behave itself rather than
  // erroring at the person who filled it in. Logged, reported as simulated.
  if (!apiKey || !from) {
    console.info("[contact] no RESEND_API_KEY/CONTACT_FROM_EMAIL — not sent:", {
      name,
      email,
      phone,
      context: body.context,
    });
    return NextResponse.json({ ok: true, simulated: true });
  }

  const html = `
    <p><strong>${escapeHtml(name)}</strong> asked for market research via the Desktop Land Estimate.</p>
    <p>
      Email: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a><br/>
      ${phone ? `Phone: ${escapeHtml(phone)}<br/>` : ""}
      ${body.context ? `Context: ${escapeHtml(body.context)}<br/>` : ""}
    </p>
    <hr/>
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [TO],
        // So hitting reply in the inbox goes to the enquirer, not to Resend.
        reply_to: email,
        subject: `Market research request — ${name}`,
        html,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[contact] resend rejected the send:", res.status, detail);
      return NextResponse.json(
        { error: "Could not send that — please email morne@investorproperty.co.za directly" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not send that — please email morne@investorproperty.co.za directly" },
      { status: 502 },
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
