import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const W = 1200;
const H = 630;
const NAVY = "#1a3a6b";

// Resize logo to fit nicely on the left side
const logoSize = 220;
const logoBuffer = await sharp(resolve(root, "public/logo.png"))
  .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// Build SVG for background + text
const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${NAVY}" />

  <!-- Subtle diagonal stripe accent -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#stripe)" opacity="0.04" />
  <defs>
    <pattern id="stripe" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="20" height="40" fill="white" />
    </pattern>
  </defs>

  <!-- Divider line -->
  <line x1="330" y1="175" x2="330" y2="455" stroke="white" stroke-width="1.5" opacity="0.25" />

  <!-- Main headline -->
  <text
    x="380" y="270"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="72"
    font-weight="bold"
    fill="white"
    letter-spacing="-1"
  >WhoIsMyRep.us</text>

  <!-- Tagline -->
  <text
    x="382" y="330"
    font-family="-apple-system, Arial, sans-serif"
    font-size="28"
    fill="white"
    opacity="0.75"
  >Find your representatives.</text>

  <text
    x="382" y="368"
    font-family="-apple-system, Arial, sans-serif"
    font-size="28"
    fill="white"
    opacity="0.75"
  >Votes, finances, legislation — all in one place.</text>

  <!-- Bottom flag strip -->
  <rect x="0" y="590" width="${W}" height="12" fill="#B22234" />
  <rect x="0" y="602" width="${W}" height="8" fill="white" />
  <rect x="0" y="610" width="${W}" height="12" fill="#B22234" />
  <rect x="0" y="622" width="${W}" height="8" fill="white" />
</svg>
`;

await sharp(Buffer.from(svg))
  .composite([
    {
      input: logoBuffer,
      top: Math.round((H - logoSize) / 2),
      left: 60,
    },
  ])
  .png()
  .toFile(resolve(root, "public/og-image.png"));

console.log("✅  public/og-image.png generated (1200×630)");
