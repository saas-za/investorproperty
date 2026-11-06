import { NextResponse } from "next/server";
import { callerKey, rateLimited } from "@/lib/server/rate-limit";
import { sendViaResend } from "@/lib/server/resend";

export const runtime = "nodejs";

const TO = "morne@investorproperty.co.za";
/** The HubSpot account and the website form it already has, so enquiries keep landing in the CRM. */
const HUBSPOT_PORTAL = "3788112";
const HUBSPOT_FORM = "f710a039-0d85-42bd-8c6b-4a149c7f5de8";

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The enquiry form on the public site. The email to Morné is what must succeed; passing the
 * enquiry to the HubSpot CRM is attempted alongside it and never blocks or fails the visitor.
 */
export async function POST(request: Request) {
  if (rateLimited("enquiry", callerKey(request), 4)) {
    return NextResponse.json({ error: "That has already been sent. Please give it a minute." }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  // A hidden field only automated senders fill in: pretend it worked.
  if (clip(body.website, 200)) return NextResponse.json({ ok: true });

  const firstName = clip(body.firstName, 100);
  const lastName = clip(body.lastName, 100);
  const email = clip(body.email, 200);
  const company = clip(body.company, 200);
  const phone = clip(body.phone, 50);
  const message = clip(body.message, 4000);
  const interest = clip(body.interest, 100);
  const marketing = body.marketing === true;

  if (!firstName || !email) return NextResponse.json({ error: "Your first name and email are needed." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });
  }

  const sent = await sendViaResend({
    to: [TO],
    subject: `Website enquiry from ${firstName} ${lastName}`.trim(),
    html: `
      <p><strong>${esc(`${firstName} ${lastName}`.trim())}</strong> sent an enquiry through investorproperty.co.za.</p>
      <p>
        Email: <a href="mailto:${esc(email)}">${esc(email)}</a><br/>
        ${company ? `Company: ${esc(company)}<br/>` : ""}
        ${phone ? `Phone: ${esc(phone)}<br/>` : ""}
        ${interest ? `Page: ${esc(interest)}<br/>` : ""}
        Happy to receive other communications: ${marketing ? "yes" : "no"}
      </p>
      ${message ? `<hr/><p style="white-space:pre-wrap">${esc(message)}</p>` : ""}`,
    replyTo: email,
  });

  // Best effort: the CRM copy. A failure here is not the visitor's problem.
  try {
    await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL}/${HUBSPOT_FORM}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify({
        fields: [
          { name: "firstname", value: firstName },
          { name: "lastname", value: lastName },
          { name: "email", value: email },
          { name: "company", value: company },
          { name: "phone", value: phone },
        ].filter((f) => f.value),
        context: { pageUri: "https://www.investorproperty.co.za/contact", pageName: interest || "Contact" },
      }),
    });
  } catch {
    /* ignored on purpose */
  }

  if (!sent.ok) {
    return NextResponse.json({ error: "That could not be sent. Please email us directly." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
