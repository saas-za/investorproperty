import "server-only";
import { lookupParcel } from "./parcel-lookup";
import { zoneLimits } from "./zoning-coct";
import { generateSiteMap } from "./site-map";

/**
 * The land-opportunity-to-developer email. Same job as
 * `sendPropertyEmailToDeveloper` in Morné's existing Apps Script — a
 * bilingual HTML email with the property's key figures, a zoning summary and
 * a satellite map — rebuilt here so the CRM's "add the land, then actually
 * do something with it" gap has a real send behind it.
 *
 * Two things upgraded from the original rather than just ported:
 *
 *  1. The map is the parcel's real registered boundary over satellite
 *     imagery (`generateSiteMap`), not a single marker pin — see
 *     `site-map.ts`.
 *  2. The zoning summary only ever shows a rich breakdown (primary/consent
 *     uses) for codes actually verified against the published City of Cape
 *     Town regulations (`zoning-coct.ts`, currently GR2–GR6 and GB1–GB7).
 *     Everything else falls back to "refer to the municipal scheme" — the
 *     same honest fallback the original script used for codes outside its
 *     own dictionary, kept deliberately rather than guessing at zones that
 *     haven't been checked against a primary source.
 */

export interface LandEmailInput {
  name: string;
  location: string;
  askingPrice?: number;
  erfNo?: string;
  lpiCode?: string;
  areaM2: number;
  currentZoning: string;
  proposedZoning?: string;
  description?: string;
  /**
   * Rough centre points, not boundaries. The email re-derives each parcel's
   * *current* boundary from the cadastre right before sending, rather than
   * mailing out whatever shape was true the day the opportunity was added —
   * see the CRM land page's own reasoning for not storing boundaries
   * long-term, and `Parcel.centroid` in `parcel-lookup.ts`.
   */
  centroids: { lat: number; lng: number }[];
}

export interface DeveloperRecipient {
  name: string;
  language: "en" | "af";
  emails: string[];
}

const rand = (n?: number) =>
  n ? `R ${Math.round(n).toLocaleString("en-ZA")}` : "POA";

function zoneSummaryHTML(code: string | undefined, isAfrikaans: boolean): string {
  const zone = code ? zoneLimits(code) : undefined;
  if (!zone) {
    return `<p style="font-size:13px;margin:5px 0;">${
      isAfrikaans
        ? "Verwys na die munisipale skema vir besonderhede."
        : "Refer to the municipal scheme for details."
    }</p>`;
  }
  return `
    <ul style="font-size:13px;margin-top:5px;padding-left:20px;">
      <li><strong>${isAfrikaans ? "Vloerfaktor" : "Floor factor"}:</strong> ${zone.floorFactor.toFixed(2)}</li>
      ${zone.coverage !== undefined ? `<li><strong>${isAfrikaans ? "Dekking" : "Coverage"}:</strong> ${(zone.coverage * 100).toFixed(0)}%</li>` : ""}
      <li><strong>${isAfrikaans ? "Hoogtebeperking" : "Height limit"}:</strong> ${zone.maxHeightM.toFixed(0)} m</li>
      <li><strong>${isAfrikaans ? "Primêre Gebruike" : "Primary uses"}:</strong> ${zone.primaryUses}</li>
      <li><strong>${isAfrikaans ? "Vergunningsgebruike" : "Consent uses"}:</strong> ${zone.consentUses}</li>
    </ul>
  `;
}

/** Builds the HTML and returns it alongside the map, ready to hand to a sender. */
export async function buildLandEmail(
  property: LandEmailInput,
  recipient: DeveloperRecipient,
) {
  const isAfrikaans = recipient.language === "af";
  const displayZoning =
    property.proposedZoning && property.proposedZoning !== property.currentZoning
      ? property.proposedZoning
      : property.currentZoning;
  const zoningHeading = property.proposedZoning && property.proposedZoning !== property.currentZoning
    ? (isAfrikaans ? "Voorgestelde Sonering Toelating" : "Proposed Zoning Allowances")
    : (isAfrikaans ? "Sonering Toelating" : "Zoning Allowances");

  let mapDataUri: string | undefined;
  try {
    if (property.centroids.length > 0) {
      // Fresh lookups, not a stored shape — a subdivision since the
      // opportunity was added shows up correctly here rather than mailing
      // out a boundary that's since gone stale.
      const fresh = await Promise.all(
        property.centroids.map((c) => lookupParcel(c.lat, c.lng)),
      );
      const parcels = fresh
        .map((r) => r.parcel)
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && p!.rings.length > 0)
        .map((p) => ({ rings: p!.rings }));

      if (parcels.length > 0) {
        const png = await generateSiteMap({ parcels });
        mapDataUri = `data:image/png;base64,${png.toString("base64")}`;
      }
    }
  } catch {
    // A missing map is a worse email, not a failed one.
  }

  const t = {
    greeting: isAfrikaans ? `Beste ${recipient.name},` : `Hi ${recipient.name},`,
    intro: isAfrikaans
      ? "Vind asseblief die onderstaande grondontwikkelingsgeleentheid vir u aandag. Moet asseblief nie huiwer om my te kontak indien u enige vrae het nie."
      : "Please see the land opportunity for your attention below. Should there be any questions, please do not hesitate to contact me.",
    askingPrice: isAfrikaans ? "Vraprys:" : "Asking Price:",
    erfLabel: isAfrikaans ? "Erf / Plaas Nr:" : "Erf / Farm No:",
    extent: isAfrikaans ? "Grootte:" : "Extent:",
    currZoning: isAfrikaans ? "Huidige Sonering:" : "Current Zoning:",
    expZoning: isAfrikaans ? "Verwagte Sonering:" : "Expected Zoning:",
    overview: isAfrikaans ? "Eiendomsoorsig" : "Property Overview",
    zoningSummaryTitle: isAfrikaans ? "Oorsig van Toegelate Gebruike" : "Zoning Uses Summary",
    signoffName: "Morné Combrinck",
    signoffTitle: isAfrikaans ? "Kommersiële Eiendomsmakelaar" : "Commercial Property Broker",
  };

  const html = `
    <div style="font-family:Arial,sans-serif;color:#2c3e50;line-height:1.6;max-width:600px;margin:0 auto;">
      <p style="font-size:15px;">${t.greeting}</p>
      <p style="font-size:15px;">${t.intro}</p>
      <hr style="border:0;border-top:1px solid #eee;margin:20px 0;" />
      <h2 style="color:#1a365d;margin-top:0;font-size:20px;">${property.name} — ${property.location}</h2>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;">
        <tr style="background-color:#f8f9fa;">
          <td style="padding:8px 12px;font-weight:bold;width:40%;">${t.askingPrice}</td>
          <td style="padding:8px 12px;">${rand(property.askingPrice)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;">${t.erfLabel}</td>
          <td style="padding:8px 12px;">${property.erfNo ?? "N/A"}</td>
        </tr>
        <tr style="background-color:#f8f9fa;">
          <td style="padding:8px 12px;font-weight:bold;">${t.extent}</td>
          <td style="padding:8px 12px;">${Math.round(property.areaM2).toLocaleString("en-ZA")} m² (${(property.areaM2 / 10_000).toFixed(2)} ha)</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;">${t.currZoning}</td>
          <td style="padding:8px 12px;">${property.currentZoning || "N/A"}</td>
        </tr>
        ${property.proposedZoning ? `
        <tr style="background-color:#f8f9fa;">
          <td style="padding:8px 12px;font-weight:bold;">${t.expZoning}</td>
          <td style="padding:8px 12px;">${property.proposedZoning}</td>
        </tr>` : ""}
      </table>

      ${property.description ? `
      <h3 style="color:#1a365d;font-size:16px;margin-bottom:8px;">${t.overview}</h3>
      <p style="font-size:14px;background-color:#f8f9fa;padding:12px;border-left:4px solid #1a365d;border-radius:4px;margin-bottom:20px;">
        ${property.description}
      </p>` : ""}

      <h3 style="color:#1a365d;font-size:16px;margin-bottom:8px;">${zoningHeading} (${displayZoning || "N/A"})</h3>
      <div style="background-color:#f0f4f8;padding:12px;border-radius:4px;margin-bottom:20px;">
        ${zoneSummaryHTML(displayZoning, isAfrikaans)}
      </div>

      ${mapDataUri ? `
      <h3 style="color:#1a365d;font-size:16px;margin-bottom:8px;">${isAfrikaans ? "Ligging" : "Location"}</h3>
      <div style="text-align:center;margin-top:10px;">
        <img src="${mapDataUri}" style="width:100%;max-width:600px;height:auto;border-radius:6px;border:1px solid #ccc;" alt="Satellite map with the parcel boundary" />
      </div>` : ""}

      <table cellpadding="0" cellspacing="0" border="0" width="600" style="margin-top:30px;font-family:Arial;">
        <tr>
          <td>
            <h2 style="margin:0;font-size:18px;font-family:Arial;color:#26415e;font-weight:600;">${t.signoffName}</h2>
            <p style="margin:0;color:#26415e;font-size:14px;">${t.signoffTitle}</p>
            <p style="margin:4px 0 0;font-size:14px;">
              <a href="mailto:morne@investorproperty.co.za" style="color:#26415e;text-decoration:none;">morne@investorproperty.co.za</a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  const subject = `${isAfrikaans ? "Grondontwikkelingsgeleentheid" : "Development Opportunity"}: ${property.name} (${property.location})`;

  return { html, subject };
}
