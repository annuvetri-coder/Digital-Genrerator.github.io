// Official "ITS YOUR TURN" Brand Logo SVG & Data URL
// Compulsory brand asset across website, certificate templates, and loading cover

export const OFFICIAL_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <rect width="500" height="500" fill="#FFFFFF"/>
  <!-- Bold Outer Square Frame -->
  <rect x="52" y="52" width="396" height="396" fill="none" stroke="#000000" stroke-width="26"/>
  <!-- Typography: ITS YOUR TURN -->
  <g fill="#000000" font-family="'Arial Black', 'Inter', 'Helvetica Neue', 'Impact', sans-serif" font-weight="900" text-anchor="middle">
    <!-- Line 1: ITS -->
    <text x="250" y="202" font-size="142" letter-spacing="10">ITS</text>
    <!-- Line 2: YOUR -->
    <text x="250" y="304" font-size="104" letter-spacing="4">YOUR</text>
    <!-- Line 3: TURN -->
    <text x="250" y="400" font-size="108" letter-spacing="6">TURN</text>
  </g>
</svg>`;

export const OFFICIAL_LOGO_TRANSPARENT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <!-- Bold Outer Square Frame with Transparent BG -->
  <rect x="52" y="52" width="396" height="396" fill="none" stroke="#000000" stroke-width="26"/>
  <!-- Typography: ITS YOUR TURN -->
  <g fill="#000000" font-family="'Arial Black', 'Inter', 'Helvetica Neue', 'Impact', sans-serif" font-weight="900" text-anchor="middle">
    <text x="250" y="202" font-size="142" letter-spacing="10">ITS</text>
    <text x="250" y="304" font-size="104" letter-spacing="4">YOUR</text>
    <text x="250" y="400" font-size="108" letter-spacing="6">TURN</text>
  </g>
</svg>`;

export const OFFICIAL_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(OFFICIAL_LOGO_SVG)}`;
export const OFFICIAL_LOGO_TRANSPARENT_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(OFFICIAL_LOGO_TRANSPARENT_SVG)}`;
