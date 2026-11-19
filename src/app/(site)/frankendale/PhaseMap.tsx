import data from "@/lib/site/frankendale-phases.json";

type Ring = number[][];
type Feature = { phase: number; label: [number, number]; geometry: { type: string; coordinates: unknown } };

export const OPEN: Record<number, { zone: "ri" | "mix"; zoning: string; land: string }> = {
  1: { zone: "ri", zoning: "Risk Industry (RI)", land: "30.54 ha" },
  2: { zone: "ri", zoning: "Risk Industry (RI)", land: "3.62 ha" },
  5: { zone: "mix", zoning: "General Industrial 1 (GI1) and RI", land: "8.80 ha" },
  6: { zone: "mix", zoning: "General Industrial 1 (GI1) and RI", land: "17.17 ha" },
};
export const COLOUR = { ri: "#26415E", mix: "#B79653", locked: "#D9D6D2" };

const rings = (f: Feature): Ring[] =>
  f.geometry.type === "Polygon" ? (f.geometry.coordinates as Ring[]) : (f.geometry.coordinates as Ring[][]).flat();

/** The phases as drawn on the City-approved plan, from the same shapes as the private map. */
export default function PhaseMap({ backdrop = false }: { backdrop?: boolean }) {
  const features = data.features as Feature[];
  const all = features.flatMap((f) => rings(f).flat());
  const minLon = Math.min(...all.map((c) => c[0]));
  const maxLon = Math.max(...all.map((c) => c[0]));
  const minLat = Math.min(...all.map((c) => c[1]));
  const maxLat = Math.max(...all.map((c) => c[1]));
  const k = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const W = 1000;
  const scale = W / ((maxLon - minLon) * k);
  const H = Math.round((maxLat - minLat) * scale);
  const x = (lon: number) => ((lon - minLon) * k * scale).toFixed(1);
  const y = (lat: number) => ((maxLat - lat) * scale).toFixed(1);
  if (backdrop) {
    // The whole plan, wordless, in blue tones and pushed to the right, for behind a page heading.  The open phases are the deeper blue.
    return (
      <svg viewBox={`180 ${Math.round(H * 0.42)} 800 ${Math.round(800 / 2.1)}`} preserveAspectRatio="xMaxYMid slice" aria-hidden="true" className="h-full w-full">
        {features.map((f, i) => {
          const d = rings(f).map((r) => `M${r.map((c) => `${x(c[0])},${y(c[1])}`).join("L")}Z`).join("");
          const tones = ["#26415E", "#4F6F9C", "#7C97BE", "#355682"];
          return <path key={f.phase} d={d} fill={tones[i % tones.length]} fillOpacity={0.8} fillRule="evenodd" stroke="#F5F3F2" strokeWidth={3} />;
        })}
      </svg>
    );
  }
  return (
    <svg viewBox={`-20 -20 ${W + 40} ${H + 40}`} role="img" aria-label="Map of the Frankendale phases: phases 1, 2, 5 and 6 are open for interest" className="mx-auto h-auto max-h-[620px] w-full">
      {features.map((f) => {
        const open = OPEN[f.phase];
        const d = rings(f).map((r) => `M${r.map((c) => `${x(c[0])},${y(c[1])}`).join("L")}Z`).join("");
        return <path key={f.phase} d={d} fill={open ? COLOUR[open.zone] : COLOUR.locked} fillRule="evenodd" stroke="#FFFFFF" strokeWidth={2} />;
      })}
      {features.map((f) => {
        const open = !!OPEN[f.phase];
        return (
          <text key={`t${f.phase}`} x={x(f.label[0])} y={y(f.label[1])} textAnchor="middle" dominantBaseline="central" fontSize={open ? 30 : 22} fontWeight={300} fill={open ? "#F5F3F2" : "#6B7280"}>
            {f.phase}
          </text>
        );
      })}
    </svg>
  );
}
