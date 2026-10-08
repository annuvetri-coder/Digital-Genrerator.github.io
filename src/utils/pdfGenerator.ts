import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { CertificateTemplate, CompanySettings, StudentRecord } from '../types';
import { exportCertificateAsDataUrl, exportCertificateAsBlob } from './canvasRenderer';

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

export function formatCertificateFilename(
  certNumber: string,
  studentName: string,
  extension: 'pdf' | 'png' | 'jpg'
): string {
  const safeNumber = sanitizeFilename(certNumber || 'CERT');
  const safeName = sanitizeFilename(studentName || 'Student');
  return `${safeNumber}_${safeName}.${extension}`;
}

export async function generateSinglePdfBlob(
  template: CertificateTemplate,
  student: StudentRecord,
  settings: CompanySettings
): Promise<Blob> {
  // Render high-res JPEG/PNG
  const dataUrl = await exportCertificateAsDataUrl(template, student, settings, 'image/jpeg');

  // A4 Landscape dimensions in mm: 297 x 210
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  return pdf.output('blob');
}

export async function downloadSingleCertificate(
  template: CertificateTemplate,
  student: StudentRecord,
  settings: CompanySettings,
  format: 'pdf' | 'png' | 'jpg' = 'pdf'
): Promise<void> {
  const filename = formatCertificateFilename(
    student.certificateNumber,
    student.studentName,
    format
  );

  let blob: Blob;
  if (format === 'pdf') {
    blob = await generateSinglePdfBlob(template, student, settings);
  } else {
    blob = await exportCertificateAsBlob(
      template,
      student,
      settings,
      format === 'png' ? 'image/png' : 'image/jpeg'
    );
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export interface BulkGenerationOptions {
  template: CertificateTemplate;
  students: StudentRecord[];
  settings: CompanySettings;
  format: 'pdf' | 'png' | 'jpg';
  onProgress?: (completed: number, total: number, currentStudent: string) => void;
  shouldCancel?: () => boolean;
}

export async function generateBulkCertificatesZip(
  options: BulkGenerationOptions
): Promise<{ zipBlob: Blob; totalGenerated: number }> {
  const { template, students, settings, format, onProgress, shouldCancel } = options;
  const zip = new JSZip();
  const total = students.length;
  let completed = 0;

  for (let i = 0; i < students.length; i++) {
    if (shouldCancel && shouldCancel()) {
      throw new Error('Generation cancelled by user');
    }

    const student = students[i];
    if (onProgress) {
      onProgress(completed, total, student.studentName);
    }

    const filename = formatCertificateFilename(
      student.certificateNumber,
      student.studentName,
      format
    );

    if (format === 'pdf') {
      const pdfBlob = await generateSinglePdfBlob(template, student, settings);
      zip.file(filename, pdfBlob);
    } else {
      const imgBlob = await exportCertificateAsBlob(
        template,
        student,
        settings,
        format === 'png' ? 'image/png' : 'image/jpeg'
      );
      zip.file(filename, imgBlob);
    }

    completed++;
    if (onProgress) {
      onProgress(completed, total, student.studentName);
    }

    // Small yielding break to keep UI responsive
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { zipBlob, totalGenerated: completed };
}
