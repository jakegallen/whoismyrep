import { Helmet } from "react-helmet-async";

const SITE_NAME = "WhoIsMyRep.us";
const DEFAULT_DESCRIPTION =
  "Find your representatives instantly — federal, state, and local. Search any U.S. address to see voting records, campaign finance, legislation, and more.";
const DEFAULT_OG_IMAGE = "https://whoismyrep.us/og-image.png";
const BASE_URL = "https://whoismyrep.us";

interface SEOProps {
  /** Page title — will be suffixed with " | WhoIsMyRep.us" unless `raw` is true */
  title?: string;
  /** Meta description (also used for og:description / twitter:description) */
  description?: string;
  /** Canonical path, e.g. "/politicians" — full URL is computed automatically */
  path?: string;
  /** OG image URL override */
  image?: string;
  /** If true, title is used exactly as-is (no suffix) */
  raw?: boolean;
  /** og:type — defaults to "website" */
  type?: string;
  /** Additional JSON-LD structured data */
  jsonLd?: Record<string, unknown>;
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image = DEFAULT_OG_IMAGE,
  raw = false,
  type = "website",
  jsonLd,
}: SEOProps) {
  const fullTitle = title
    ? raw
      ? title
      : `${title} | ${SITE_NAME}`
    : `${SITE_NAME} — Find Your U.S. Representatives`;

  const canonical = path ? `${BASE_URL}${path}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Canonical */}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
