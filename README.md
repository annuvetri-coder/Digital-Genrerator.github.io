# Digital Certificate Generator

A complete, production-ready web application designed for companies (configured by default for **ITS YOUR TURN**, `itsyourturn.co.in`) to generate hundreds of professional, high-resolution digital certificates automatically from blank certificate templates and Excel/CSV spreadsheets.

---

## 🌟 Key Features

1. **Clean Professional Dashboard**:
   - Real-time stats (Total Issued, Active Batches, Valid vs. Revoked).
   - Quick actions for single-click sample testing, template editing, and public verification.

2. **Certificate Template Upload & Presets**:
   - Upload any blank company certificate (PNG, JPG, or PDF).
   - High-fidelity vector SVG presets (Executive Navy & Gold, Modern Tech & IoT) included out of the box.
   - Original background quality, borders, and logos preserved without distortion.

3. **Visual Drag-and-Drop Template Editor**:
   - Interactive canvas: Drag, position, and resize fields on the template canvas.
   - Dynamic placeholders:
     - `{{STUDENT_NAME}}`
     - `{{CERTIFICATE_NUMBER}}`
     - `{{COURSE_NAME}}`
     - `{{DATE}}`
     - `{{ORGANIZATION}}`
     - `{{QR_CODE}}`
     - Custom user-defined fields
   - Typography controls: Font family (Playfair Display, Cinzel, Montserrat, Inter, Great Vibes, etc.), font size (10–140px), font weight, italics, alignment, and color picker.
   - "Center Horizontally" 1-click button.

4. **Excel & CSV Upload with Smart Column Mapping**:
   - Automatically detects column headers (`Student Name`, `Course`, `Date`, `S.No`).
   - Built-in "Download Sample Excel Template" button.
   - 1-click "Use Sample Data (IoT Training)" button with pre-configured student roster.

5. **Automated Numbering Engine**:
   - Sequential numbering (`IYT-2026-0001`, `IYT-2026-0002`...).
   - Alphabetical student-based numbering (e.g. Arun Kumar → 0001, Bala Kumar → 0002).
   - Configurable prefix (`IYT-2026-`, `CERT-`, etc.), start number, and zero-padding digits.
   - Automatic uniqueness check preventing collisions with existing records.

6. **Pre-flight Error Detection & Validation**:
   - Checks for missing student names, duplicate students, duplicate certificate numbers, and empty rows.
   - Blocks generation if critical errors are present to prevent issuing invalid certificates.

7. **Bulk Generation & Packaging**:
   - High-resolution client & server canvas rendering at 1920x1080 / 300 DPI equivalent.
   - Generates individual PDF or PNG/JPG certificates with sanitized filenames (`IYT-2026-0001_Arun_Kumar.pdf`).
   - Live progress indicator (`25 / 100`, `50 / 100`, `100 / 100`).
   - Bundles all certificates into a single compressed `.ZIP` file.

8. **Public Digital Verification Portal (`/verify`)**:
   - Enter certificate number (e.g., `IYT-2026-0001`) or scan the embedded QR code.
   - Live validity verification:
     - **VALID**: Official security badge, student name, course, issuing authority, issue date, verification ID.
     - **REVOKED**: High-visibility warning badge with revocation reason.
     - **INVALID**: Clear message indicating unverified credentials.
   - Printable verification slip.

9. **Certificate Registry & Revocation**:
   - Searchable, filterable database of all issued credentials.
   - Revoke/reinstate certificates with reason tracking.
   - Export full certificate registry to CSV.

10. **Offline / Local Architecture**:
    - Runs completely offline without internet connection or external third-party API dependencies.
    - Uses local SQLite persistence via WebAssembly (`sql.js`) with an offline localStorage fallback.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or bun

### Installation

```bash
# 1. Clone repository
git clone <repo-url>
cd digital-certificate-generator

# 2. Install dependencies
npm install

# 3. Start development server (Node Express + Vite)
npm run dev
```

The application will be available at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

---

## 🔑 Default Administrator Credentials

- **Email**: `admin@itsyourturn.co.in`
- **Password**: `admin123`

---

## 📁 Project Structure

```
├── /data/                     # SQLite database file storage (certificates.sqlite)
├── /server/
│   ├── db.ts                  # SQLite initialization and disk persistence
│   └── routes/
│       └── api.ts             # Express API endpoints (auth, batches, templates, certs, verify)
├── /src/
│   ├── components/
│   │   ├── wizard/            # 6-step Certificate Generation Wizard
│   │   │   ├── BatchWizard.tsx
│   │   │   ├── Step1DetailsTemplate.tsx
│   │   │   ├── Step2TemplateEditor.tsx
│   │   │   ├── Step3ExcelMapping.tsx
│   │   │   ├── Step4NumberingSettings.tsx
│   │   │   ├── Step5StudentPreview.tsx
│   │   │   └── Step6LivePreviewGenerate.tsx
│   │   ├── BatchesManager.tsx # Batch list, details, and ZIP downloads
│   │   ├── CertificateRecords.tsx # Database registry & revoke/reinstate
│   │   ├── DashboardOverview.tsx # Metrics & quick actions
│   │   ├── LoginModal.tsx     # Admin authentication dialog
│   │   ├── Navbar.tsx         # Header branding & verification shortcut
│   │   ├── SettingsPage.tsx   # Company branding & numbering defaults
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── TemplateLibrary.tsx# Template management & visual editor
│   │   └── VerificationPortal.tsx # Public /verify portal & slip print
│   ├── context/
│   │   ├── AuthContext.tsx    # Admin authentication context
│   │   └── SettingsContext.tsx# Company branding context
│   ├── services/
│   │   └── api.ts             # API client with offline localStorage fallback
│   ├── types/
│   │   └── index.ts           # Core TypeScript interfaces
│   ├── utils/
│   │   ├── canvasRenderer.ts  # HTML5 Canvas high-res certificate renderer
│   │   ├── defaultTemplates.ts# Executive Navy/Gold & Modern Teal presets
│   │   ├── excelParser.ts     # SheetJS spreadsheet parser & column detector
│   │   ├── numberingEngine.ts # Numbering algorithms, sorting & validation
│   │   ├── pdfGenerator.ts    # jsPDF & JSZip batch export engine
│   │   └── qrGenerator.ts     # QR code generation utility
│   ├── App.tsx
│   └── main.tsx
├── server.ts                  # Express full-stack entry point with Vite middleware
├── package.json
└── README.md
```
