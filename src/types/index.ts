export interface TemplateElement {
  id: string;
  type: 'text' | 'qr' | 'image';
  field: string; // e.g. '{{STUDENT_NAME}}', '{{CERTIFICATE_NUMBER}}', '{{COURSE_NAME}}', '{{DATE}}', '{{ORGANIZATION}}', '{{QR_CODE}}', '{{SIGNATURE}}'
  label: string;
  x: number; // percentage (0 - 100) or pixel
  y: number; // percentage (0 - 100) or pixel
  width?: number; // percentage or pixel
  height?: number;
  fontFamily: string;
  fontSize: number; // in pixels at base template resolution
  fontWeight: 'normal' | '500' | '600' | 'bold' | '800';
  fontStyle?: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing?: number;
  sampleText?: string;
  imageUrl?: string; // custom image or e-signature data URL
  autoFitFontSize?: boolean; // automatically scales font size down to fit allocated area
  autoAlignByLength?: boolean; // automatically aligns & centers based on string length
}

export interface CertificateTemplate {
  id: string;
  name: string;
  backgroundData: string; // Base64 image data URL or SVG data URL
  width: number; // default 1920
  height: number; // default 1080 (16:9 / Landscape A4 standard)
  elements: TemplateElement[];
  isDefault?: boolean;
  createdAt: string;
}

export interface CertificateMarksSummary {
  partA: {
    col1: number | null | ''; // 20 marks
    col2: number | null | ''; // 20 marks
    col3: number | null | ''; // 20 marks
    total: number; // 60 marks
  };
  partB: {
    col1: number | null | ''; // 20 marks
    col2: number | null | ''; // 20 marks
    optional?: number | null | ''; // 5 marks (optional if wanted)
    total: number; // 40 or 45 marks
  };
  partC?: {
    marks: number | null | '';
    title?: string;
  };
  grandTotal: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  status: 'PASS' | 'FAIL' | 'ABSENT';
}

export interface StudentRecord {
  id: string;
  serialNo: number | string;
  studentName: string;
  courseName: string;
  issueDate: string;
  certificateNumber: string;
  verificationId: string;
  marks?: CertificateMarksSummary;
  extraFields: Record<string, string>;
  status: 'valid' | 'warning' | 'error';
  validationErrors?: string[];
}

export interface CertificateBatch {
  id: string;
  batchId: string; // e.g. IYT-IOT-2026-10
  name: string;
  courseName: string;
  studentCount: number;
  templateId: string;
  templateName: string;
  issueDate: string;
  createdAt: string;
  students: StudentRecord[];
}

export interface CertificateRecord {
  id: string;
  certificateNumber: string;
  studentName: string;
  courseName: string;
  issueDate: string;
  batchId: string;
  batchName?: string;
  templateId?: string;
  verificationId: string;
  marks?: CertificateMarksSummary;
  status: 'valid' | 'revoked' | 'reissued';
  revokedReason?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  companyEmail?: string; // Authorized company email (works under Gmail domain, e.g. itsyourturn.official@gmail.com)
  website: string;
  logoUrl: string;
  signatureUrl?: string; // Uploaded digital / e-signature image URL or data URL
  certificatePrefix: string;
  defaultStartNumber: number;
  numberPadding: number;
  verificationBaseUrl: string;
  defaultFont: string;
  defaultPrimaryColor: string;
  signerName: string;
  signerTitle: string;
  organizationName: string;
}

export type NumberingMode = 'sequential' | 'alphabetical' | 'excel_order' | 'reg_no_order';

export interface NumberingConfig {
  mode: NumberingMode;
  prefix: string; // e.g. IYT-2026-
  startNumber: number; // e.g. 1 or 100
  paddingDigits: number; // e.g. 4 -> 0001
  customSuffix?: string;
}

export interface ExcelColumnMapping {
  studentNameColumn: string;
  courseColumn: string;
  dateColumn: string;
  serialNoColumn?: string;
  extraMappings?: Record<string, string>; // placeholder -> column
}

export interface VerificationResult {
  found: boolean;
  certificate?: CertificateRecord;
  settings?: {
    companyName: string;
    website: string;
    logoUrl: string;
    verificationBaseUrl: string;
  };
  message?: string;
}

export interface StudentMarkEntry {
  id: string;
  serialNo: number;
  studentId: string;
  studentName: string;
  partA: {
    col1: number | null | ''; // 20 marks
    col2: number | null | ''; // 20 marks
    col3: number | null | ''; // 20 marks
    total: number; // 60 marks total
  };
  partB: {
    col1: number | null | ''; // 1: 20 marks
    col2: number | null | ''; // 2: 20 marks
    optional?: number | null | ''; // Optional: 5 marks (if wanted)
    marks?: number | null | ''; // legacy fallback
    total: number; // Total of Part B
  };
  partC?: {
    marks: number | null | ''; // Optional (e.g. 20 marks)
    title?: string;
  };
  isAbsent?: boolean;
  grandTotal: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  status: 'PASS' | 'FAIL' | 'ABSENT';
  remarks?: string;
}

export interface MarkSession {
  id: string;
  name: string;
  subjectName: string;
  batchCode: string;
  sessionDate: string;
  evaluatorName: string;
  partAConfig: {
    maxTotal: number; // 60
    col1Max: number; // 20
    col1Label: string; // "1"
    col2Max: number; // 20
    col2Label: string; // "2"
    col3Max: number; // 20
    col3Label: string; // "3"
  };
  partBConfig: {
    maxTotal: number; // 40 (or 45 if optional is wanted)
    col1Max: number; // 20
    col1Label: string; // "1"
    col2Max: number; // 20
    col2Label: string; // "2"
    optionalMax: number; // 5
    optionalLabel: string; // "Optional"
    isOptionalEnabled: boolean; // toggle whether optional 5 marks is wanted
    label: string;
  };
  partCConfig: {
    isOptional: boolean; // Part C is optional
    isEnabled: boolean; // Toggle active
    maxMarks: number; // e.g. 20
    label: string;
  };
  passingPercentage: number; // default 50%
  students: StudentMarkEntry[];
  createdAt: string;
  updatedAt: string;
}
