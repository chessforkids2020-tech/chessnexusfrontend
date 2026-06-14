import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://chessnexus.in';
const DEFAULT_IMAGE = `${BASE_URL}/logo.png`;

export default function SEO({
  title,
  description,
  keywords,
  canonical,
  ogImage = DEFAULT_IMAGE,
  noIndex = false,
}) {
  const fullTitle = title
    ? `${title} | Chess Nexus`
    : 'Chess Nexus — Online Chess Puzzles, Tactics & Live Races';

  const fullDescription =
    description ||
    'Free online chess platform to solve daily puzzles, practice tactics, compete in live arena races, and improve your rating.';

  const fullCanonical = canonical ? `${BASE_URL}${canonical}` : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex
        ? <meta name="robots" content="noindex, nofollow" />
        : <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
      }
      {fullCanonical && <link rel="canonical" href={fullCanonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={fullTitle} />
      {fullCanonical && <meta property="og:url" content={fullCanonical} />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Chess Nexus" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
