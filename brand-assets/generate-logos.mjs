// Rasterizes the five Propello-portal logo marks (defined originally in
// conveyassist/portal/src/components/PortalLogo.tsx) as standalone SVG and
// 2000px PNG files, for Morné to actually download and use — the React
// component version only ever exists inside a running app.
import sharp from "sharp";
import { writeFileSync } from "fs";

const SIZE = 2000;

const brands = {
  crmatrix: {
    name: "CRMatrix",
    primary: "#123340",
    accent: "#d9a441",
    path: `
      <rect x="4" y="4" width="24" height="24" rx="2" />
      <path d="M12 4v24M20 4v24M4 12h24M4 20h24" stroke-width="1.2" />
      <rect x="20" y="20" width="8" height="8" fill="currentColor" stroke="none" />
    `,
  },
  convey: {
    name: "Convey",
    primary: "#1f3a5f",
    accent: "#4b9fd6",
    path: `
      <path d="M8 4h11l5 5v19H8z" />
      <path d="M19 4v5h5" stroke-width="1.2" />
      <circle cx="16" cy="19" r="4.5" fill="currentColor" stroke="none" />
    `,
  },
  bondmatrix: {
    name: "BondMatrix",
    primary: "#224a3a",
    accent: "#6cb28c",
    path: `
      <rect x="4" y="11" width="15" height="10" rx="5" />
      <rect x="13" y="11" width="15" height="10" rx="5" />
    `,
  },
  develop: {
    name: "Develop",
    primary: "#3a2c4a",
    accent: "#a882c9",
    path: `
      <path d="M4 28h24" />
      <rect x="6" y="18" width="6" height="10" />
      <rect x="13" y="12" width="6" height="16" />
      <rect x="20" y="6" width="6" height="22" fill="currentColor" stroke="none" />
    `,
  },
  parcelo: {
    name: "Parcelo",
    primary: "#0f2e3d",
    accent: "#3fb0c4",
    // An irregular parcel boundary, the way a real surveyed erf diagram
    // looks, with a filled corner beacon — the physical marker that fixes
    // where a boundary corner actually is. Replaced the Propello forward
    // arrow when the platform was renamed.
    path: `
      <path d="M7 9 L23 6 L26 20 L15 27 L6 19 Z" />
      <circle cx="7" cy="9" r="2.5" fill="currentColor" stroke="none" />
    `,
  },
};

function buildSvg({ primary, accent, path }, { tile }) {
  const markSvg = `
    <svg viewBox="0 0 32 32" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="square">
      ${path}
    </svg>`;

  // Every mark's filled detail — the matrix's due cell, Convey's seal,
  // Develop's tallest block, Parcelo's corner beacon — is authored as
  // fill="currentColor" so it follows the surrounding text colour in the
  // React components. A standalone SVG file has no surrounding text colour,
  // so currentColor there resolves to its initial value: black. Setting
  // color= explicitly is what makes these files match what the app renders,
  // instead of quietly shipping a black blob on every mark but BondMatrix
  // (the only one with no filled detail).
  if (!tile) {
    // Transparent background, mark only — for overlaying on any colour.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 32 32" fill="none" color="${accent}" stroke="${accent}" stroke-width="1.8" stroke-linecap="square">${path}</svg>`;
  }

  // App-icon style: mark on a rounded square of the brand's primary colour,
  // the same presentation used in the app header.
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="5" fill="${primary}" />
      <g transform="translate(4,4) scale(0.75)" fill="none" color="${accent}" stroke="${accent}" stroke-width="1.8" stroke-linecap="square">
        ${path}
      </g>
    </svg>`;
}

for (const [key, brand] of Object.entries(brands)) {
  // Version 1: transparent mark only, for use on any background.
  const markSvg = buildSvg(brand, { tile: false });
  writeFileSync(`brand-assets/${key}-mark.svg`, markSvg.trim());
  await sharp(Buffer.from(markSvg))
    .resize(SIZE, SIZE)
    .png()
    .toFile(`brand-assets/${key}-mark-2000px.png`);

  // Version 2: app-icon tile (mark + brand-colour rounded square background).
  const tileSvg = buildSvg(brand, { tile: true });
  writeFileSync(`brand-assets/${key}-icon.svg`, tileSvg.trim());
  await sharp(Buffer.from(tileSvg))
    .resize(SIZE, SIZE)
    .png()
    .toFile(`brand-assets/${key}-icon-2000px.png`);

  console.log(`✓ ${brand.name} — mark + icon, SVG + 2000px PNG`);
}

console.log("\nDone. Files are in investorproperty/brand-assets/");
