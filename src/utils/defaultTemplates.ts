import { CertificateTemplate, TemplateElement } from '../types';

// Standard 16:9 high-res canvas (1920 x 1080)
const WIDTH = 1920;
const HEIGHT = 1080;

// High-fidelity SVG template backgrounds
const createNavyGoldSvg = () => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FAFBFD"/>
          <stop offset="50%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#F4F6FB"/>
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#B8860B"/>
          <stop offset="25%" stop-color="#DAA520"/>
          <stop offset="50%" stop-color="#FFD700"/>
          <stop offset="75%" stop-color="#DAA520"/>
          <stop offset="100%" stop-color="#B8860B"/>
        </linearGradient>
        <linearGradient id="navyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0F172A"/>
          <stop offset="100%" stop-color="#1E293B"/>
        </linearGradient>
        <pattern id="guilloche" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="28" fill="none" stroke="#E2E8F0" stroke-width="0.5" stroke-dasharray="2,2"/>
          <circle cx="30" cy="30" r="20" fill="none" stroke="#CBD5E1" stroke-width="0.5"/>
        </pattern>
      </defs>

      <!-- Background -->
      <rect width="1920" height="1080" fill="url(#bgGrad)" />
      <rect width="1920" height="1080" fill="url(#guilloche)" opacity="0.4" />

      <!-- Outer Border -->
      <rect x="40" y="40" width="1840" height="1000" rx="4" fill="none" stroke="url(#navyGrad)" stroke-width="12" />
      <rect x="58" y="58" width="1804" height="964" rx="2" fill="none" stroke="url(#goldGrad)" stroke-width="3" />
      <rect x="68" y="68" width="1784" height="944" rx="2" fill="none" stroke="#E2E8F0" stroke-width="1" />

      <!-- Decorative Corner Ornaments -->
      <!-- Top Left -->
      <path d="M 40,160 L 160,40 L 180,40 L 40,180 Z" fill="url(#goldGrad)" opacity="0.8"/>
      <polygon points="45,45 130,45 45,130" fill="#0F172A" />
      <polygon points="52,52 110,52 52,110" fill="url(#goldGrad)" />
      
      <!-- Top Right -->
      <path d="M 1880,160 L 1760,40 L 1740,40 L 1880,180 Z" fill="url(#goldGrad)" opacity="0.8"/>
      <polygon points="1875,45 1790,45 1875,130" fill="#0F172A" />
      <polygon points="1868,52 1810,52 1868,110" fill="url(#goldGrad)" />

      <!-- Bottom Left -->
      <path d="M 40,920 L 160,1040 L 180,1040 L 40,900 Z" fill="url(#goldGrad)" opacity="0.8"/>
      <polygon points="45,1035 130,1035 45,950" fill="#0F172A" />
      <polygon points="52,1028 110,1028 52,970" fill="url(#goldGrad)" />

      <!-- Bottom Right -->
      <path d="M 1880,920 L 1760,1040 L 1740,1040 L 1880,900 Z" fill="url(#goldGrad)" opacity="0.8"/>
      <polygon points="1875,1035 1790,1035 1875,950" fill="#0F172A" />
      <polygon points="1868,1028 1810,1028 1868,970" fill="url(#goldGrad)" />

      <!-- Static Titles -->
      <text x="960" y="240" font-family="'Cinzel', serif" font-size="20" font-weight="700" fill="#B8860B" text-anchor="middle" letter-spacing="8">OFFICIAL RECOGNITION</text>
      <text x="960" y="295" font-family="'Playfair Display', serif" font-size="52" font-weight="700" fill="#0F172A" text-anchor="middle" letter-spacing="3">CERTIFICATE OF COMPLETION</text>
      <line x1="720" y1="315" x2="1200" y2="315" stroke="url(#goldGrad)" stroke-width="2.5" />
      <text x="960" y="360" font-family="'Montserrat', sans-serif" font-size="18" font-weight="500" fill="#64748B" text-anchor="middle" letter-spacing="4">THIS CERTIFICATE IS PROUDLY PRESENTED TO</text>

      <!-- Context Label -->
      <text x="960" y="560" font-family="'Montserrat', sans-serif" font-size="18" font-weight="400" fill="#64748B" text-anchor="middle">has successfully completed the comprehensive training program in</text>

      <!-- Signature Area Placeholder Lines (Clean without subtitles) -->
      <!-- Left Line -->
      <line x1="300" y1="910" x2="620" y2="910" stroke="#CBD5E1" stroke-width="1.5" />

      <!-- Right Signature Baseline -->
      <line x1="1300" y1="910" x2="1620" y2="910" stroke="#CBD5E1" stroke-width="1.5" />
    </svg>
  `)}`;
};

const createModernTealSvg = () => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
      <defs>
        <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0D9488"/>
          <stop offset="50%" stop-color="#0284C7"/>
          <stop offset="100%" stop-color="#4F46E5"/>
        </linearGradient>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#F8FAFC"/>
        </linearGradient>
      </defs>

      <rect width="1920" height="1080" fill="url(#bgGradient)" />

      <!-- Modern Cyber / Tech Frames -->
      <rect x="50" y="50" width="1820" height="980" rx="16" fill="none" stroke="#E2E8F0" stroke-width="2"/>
      <path d="M 50,200 L 50,50 L 200,50" fill="none" stroke="url(#tealGrad)" stroke-width="8" stroke-linecap="round"/>
      <path d="M 1870,200 L 1870,50 L 1720,50" fill="none" stroke="url(#tealGrad)" stroke-width="8" stroke-linecap="round"/>
      <path d="M 50,880 L 50,1030 L 200,1030" fill="none" stroke="url(#tealGrad)" stroke-width="8" stroke-linecap="round"/>
      <path d="M 1870,880 L 1870,1030 L 1720,1030" fill="none" stroke="url(#tealGrad)" stroke-width="8" stroke-linecap="round"/>

      <!-- Accent Top Banner -->
      <rect x="660" y="50" width="600" height="8" rx="4" fill="url(#tealGrad)" />

      <text x="960" y="230" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="#0D9488" text-anchor="middle" letter-spacing="6">CERTIFICATION OF ACHIEVEMENT</text>
      <text x="960" y="285" font-family="'Montserrat', sans-serif" font-size="46" font-weight="800" fill="#0F172A" text-anchor="middle" letter-spacing="2">DIGITAL CREDENTIAL</text>
      <text x="960" y="340" font-family="'Inter', sans-serif" font-size="16" font-weight="500" fill="#64748B" text-anchor="middle" letter-spacing="3">PRESENTED HONOREDLY TO</text>

      <text x="960" y="550" font-family="'Inter', sans-serif" font-size="18" font-weight="400" fill="#64748B" text-anchor="middle">for successfully demonstrating excellence and completing all requirements for</text>

      <!-- Signature Area Baseline (Clean without subtitles) -->
      <line x1="300" y1="910" x2="620" y2="910" stroke="#CBD5E1" stroke-width="1.5" />
      <line x1="1300" y1="910" x2="1620" y2="910" stroke="#CBD5E1" stroke-width="1.5" />
    </svg>
  `)}`;
};

export const DEFAULT_ELEMENTS: TemplateElement[] = [
  {
    id: 'elem-student-name',
    type: 'text',
    field: '{{STUDENT_NAME}}',
    label: 'Student Name',
    x: 15,
    y: 39,
    width: 70,
    height: 10,
    fontFamily: 'Playfair Display',
    fontSize: 54,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#0F172A',
    textAlign: 'center',
    sampleText: 'Arun Kumar',
  },
  {
    id: 'elem-course-name',
    type: 'text',
    field: '{{COURSE_NAME}}',
    label: 'Course Name',
    x: 20,
    y: 54,
    width: 60,
    height: 8,
    fontFamily: 'Montserrat',
    fontSize: 34,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#0284C7',
    textAlign: 'center',
    sampleText: 'IoT Training',
  },
  {
    id: 'elem-org',
    type: 'text',
    field: '{{ORGANIZATION}}',
    label: 'Organization Name',
    x: 30,
    y: 65,
    width: 40,
    height: 5,
    fontFamily: 'Montserrat',
    fontSize: 22,
    fontWeight: '600',
    fontStyle: 'normal',
    color: '#475569',
    textAlign: 'center',
    sampleText: 'ITS YOUR TURN',
  },
  {
    id: 'elem-date',
    type: 'text',
    field: '{{DATE}}',
    label: 'Issue Date',
    x: 15.6,
    y: 78,
    width: 16.7,
    height: 5,
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    fontStyle: 'normal',
    color: '#334155',
    textAlign: 'center',
    sampleText: 'Date: 05 October 2026',
  },
  {
    id: 'elem-cert-num',
    type: 'text',
    field: '{{CERTIFICATE_NUMBER}}',
    label: 'Certificate Number',
    x: 15.6,
    y: 86,
    width: 16.7,
    height: 4,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'normal',
    color: '#64748B',
    textAlign: 'center',
    sampleText: 'Certificate No: IYT-2026-0001',
  },
  {
    id: 'elem-qr',
    type: 'qr',
    field: '{{QR_CODE}}',
    label: 'Verification QR Code',
    x: 46.5,
    y: 75,
    width: 7,
    height: 12,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: 'normal',
    color: '#000000',
    textAlign: 'center',
    sampleText: 'QR Code',
  },
  {
    id: 'elem-signature',
    type: 'image',
    field: '{{SIGNATURE}}',
    label: 'Authorized E-Signature',
    x: 67.7,
    y: 73,
    width: 16.7,
    height: 10.5,
    fontFamily: 'Great Vibes',
    fontSize: 22,
    fontWeight: 'normal',
    color: '#0F172A',
    textAlign: 'center',
    sampleText: 'E-Signature',
  },
];

export function createDefaultSignatureSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 140" width="360" height="140">
    <path d="M 30 95 C 50 30, 80 20, 100 65 C 120 105, 130 115, 150 78 C 170 45, 190 40, 210 85 C 225 115, 240 100, 260 65 C 280 35, 300 55, 320 90 C 335 110, 350 100, 355 95" fill="none" stroke="#1E293B" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 40 120 C 100 110, 210 112, 330 118" fill="none" stroke="#3B82F6" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRESET_TEMPLATES: CertificateTemplate[] = [
  {
    id: 'template-navy-gold',
    name: 'Executive Navy & Gold (Official)',
    backgroundData: createNavyGoldSvg(),
    width: WIDTH,
    height: HEIGHT,
    isDefault: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    elements: JSON.parse(JSON.stringify(DEFAULT_ELEMENTS)),
  },
  {
    id: 'template-modern-teal',
    name: 'Modern Tech & IoT Certification',
    backgroundData: createModernTealSvg(),
    width: WIDTH,
    height: HEIGHT,
    isDefault: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    elements: JSON.parse(JSON.stringify(DEFAULT_ELEMENTS)),
  },
];

export const AVAILABLE_FONTS = [
  { name: 'Playfair Display', family: "'Playfair Display', serif" },
  { name: 'Cinzel', family: "'Cinzel', serif" },
  { name: 'Montserrat', family: "'Montserrat', sans-serif" },
  { name: 'Inter', family: "'Inter', sans-serif" },
  { name: 'Great Vibes', family: "'Great Vibes', cursive" },
  { name: 'Georgia', family: 'Georgia, serif' },
  { name: 'Courier New', family: "'Courier New', monospace" },
  { name: 'Arial', family: 'Arial, sans-serif' },
];

export const AVAILABLE_PLACEHOLDERS = [
  { tag: '{{STUDENT_NAME}}', label: 'Student Name', defaultSize: 52 },
  { tag: '{{CERTIFICATE_NUMBER}}', label: 'Certificate Number', defaultSize: 20 },
  { tag: '{{COURSE_NAME}}', label: 'Course Name', defaultSize: 32 },
  { tag: '{{DATE}}', label: 'Issue Date', defaultSize: 20 },
  { tag: '{{ORGANIZATION}}', label: 'Organization Name', defaultSize: 22 },
  { tag: '{{SIGNATURE}}', label: 'Authorized E-Signature', defaultSize: 24, isImage: true },
  { tag: '{{SIGNER_NAME}}', label: 'Signer Name', defaultSize: 20 },
  { tag: '{{SIGNER_TITLE}}', label: 'Signer Title / Designation', defaultSize: 16 },
  { tag: '{{MARKS}}', label: 'Marks Score (Total/Max)', defaultSize: 22 },
  { tag: '{{GRADE}}', label: 'Grade (e.g. O, A+)', defaultSize: 24 },
  { tag: '{{PERCENTAGE}}', label: 'Percentage (%)', defaultSize: 22 },
  { tag: '{{PART_A_MARKS}}', label: 'Part A Marks (/60)', defaultSize: 20 },
  { tag: '{{PART_B_MARKS}}', label: 'Part B Marks', defaultSize: 20 },
  { tag: '{{QR_CODE}}', label: 'Marks Verification QR Code', defaultSize: 14, isQr: true },
  { tag: '{{CUSTOM_FIELD}}', label: 'Custom Text / Field', defaultSize: 20 },
];
