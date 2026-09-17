import "server-only";

/**
 * Thin wrapper over Resend's HTTP API, shared by the contact form and the
 * land-opportunity emailer rather than duplicated between them.
 *
 * Without `RESEND_API_KEY`/`CONTACT_FROM_EMAIL` configured, callers get
 * `{ ok: true, simulated: true }` — the feature stays usable end-to-end in a
 * demo, and nothing fails in front of whoever is testing it.
 */
export interface SendEmailInput {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  simulated?: boolean;
  error?: string;
}

export async function sendViaResend(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !from) {
    console.info("[resend] no RESEND_API_KEY/CONTACT_FROM_EMAIL — not sent:", {
      to: input.to,
      subject: input.subject,
    });
    return { ok: true, simulated: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: input.to,
        reply_to: input.replyTo,
        subject: input.subject,
        html: input.html,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[resend] rejected the send:", res.status, detail);
      return { ok: false, error: `Resend returned ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach Resend" };
  }
}
