import { CertificateTemplate, CompanySettings, StudentRecord, TemplateElement } from '../types';
import { generateQrDataUrl } from './qrGenerator';
import { createDefaultSignatureSvg } from './defaultTemplates';
import { OFFICIAL_LOGO_DATA_URL, OFFICIAL_LOGO_TRANSPARENT_DATA_URL } from '../assets/logo';

// Cache for loaded background images to speed up bulk generation
const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
    img.src = src;
  });
}

export function replacePlaceholders(
  text: string,
  student: Partial<StudentRecord>,
  settings: Partial<CompanySettings>
): string {
  let result = text;
  const studentName = student.studentName || 'Student Name';
  const certNumber = student.certificateNumber || 'IYT-2026-0001';
  const courseName = student.courseName || 'Course Name';
  const issueDate = student.issueDate || '05 October 2026';
  const orgName = settings.organizationName || settings.companyName || 'ITS YOUR TURN';

  result = result.replace(/\{\{STUDENT_NAME\}\}/g, studentName);
  result = result.replace(/\{\{CERTIFICATE_NUMBER\}\}/g, certNumber);
  result = result.replace(/\{\{COURSE_NAME\}\}/g, courseName);
  result = result.replace(/\{\{DATE\}\}/g, issueDate);
  result = result.replace(/\{\{ORGANIZATION\}\}/g, orgName);
  result = result.replace(/\{\{SIGNER_NAME\}\}/g, settings.signerName || 'Authorized Signatory');
  result = result.replace(/\{\{SIGNER_TITLE\}\}/g, settings.signerTitle || 'Program Director');

  if (student.marks) {
    const m = student.marks;
    result = result.replace(/\{\{MARKS\}\}/g, `${m.grandTotal} / ${m.maxMarks}`);
    result = result.replace(/\{\{TOTAL_MARKS\}\}/g, String(m.grandTotal));
    result = result.replace(/\{\{MAX_MARKS\}\}/g, String(m.maxMarks));
    result = result.replace(/\{\{PERCENTAGE\}\}/g, `${m.percentage}%`);
    result = result.replace(/\{\{GRADE\}\}/g, m.grade);
    result = result.replace(/\{\{RESULT\}\}/g, m.status);
    result = result.replace(/\{\{PART_A_MARKS\}\}/g, `${m.partA.total}/60`);
    result = result.replace(/\{\{PART_B_MARKS\}\}/g, `${m.partB.total}`);
  } else {
    result = result.replace(/\{\{MARKS\}\}/g, 'Verified Score');
    result = result.replace(/\{\{TOTAL_MARKS\}\}/g, '100');
    result = result.replace(/\{\{MAX_MARKS\}\}/g, '100');
    result = result.replace(/\{\{PERCENTAGE\}\}/g, '95%');
    result = result.replace(/\{\{GRADE\}\}/g, 'O');
    result = result.replace(/\{\{RESULT\}\}/g, 'PASS');
    result = result.replace(/\{\{PART_A_MARKS\}\}/g, '60/60');
    result = result.replace(/\{\{PART_B_MARKS\}\}/g, '40/40');
  }

  if (student.extraFields) {
    Object.entries(student.extraFields).forEach(([key, val]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    });
  }

  return result;
}

export async function renderCertificateToCanvas(
  canvas: HTMLCanvasElement,
  template: CertificateTemplate,
  student: StudentRecord,
  settings: CompanySettings,
  options: { scale?: number; previewMode?: boolean } = {}
): Promise<void> {
  const baseWidth = template.width || 1920;
  const baseHeight = template.height || 1080;
  const scale = options.scale || 1;

  canvas.width = baseWidth * scale;
  canvas.height = baseHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  ctx.save();
  ctx.scale(scale, scale);

  // 1. Clear background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, baseWidth, baseHeight);

  // 2. Draw template background image/svg
  if (template.backgroundData) {
    try {
      const bgImg = await loadImage(template.backgroundData);
      ctx.drawImage(bgImg, 0, 0, baseWidth, baseHeight);
    } catch (err) {
      console.warn('Failed to draw background image, drawing fallback card:', err);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, baseWidth, baseHeight);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 10;
      ctx.strokeRect(30, 30, baseWidth - 60, baseHeight - 60);
    }
  }

  // --- MANDATORY CENTRAL WATERMARK ON EVERY CERTIFICATE ---
  // Subtly blended in the center of the certificate background behind candidate text
  try {
    const watermarkSrc = settings.logoUrl || OFFICIAL_LOGO_TRANSPARENT_DATA_URL;
    const watermarkImg = await loadImage(watermarkSrc);
    ctx.save();
    ctx.globalAlpha = 0.085; // Clear, elegant watermark visible on all certificate themes
    const watermarkSize = Math.min(baseWidth, baseHeight) * 0.46; // ~496px on 1080p
    const wmX = (baseWidth - watermarkSize) / 2;
    const wmY = (baseHeight - watermarkSize) / 2 - 10;
    ctx.drawImage(watermarkImg, wmX, wmY, watermarkSize, watermarkSize);
    ctx.restore();
  } catch (err) {
    console.warn('Failed to draw central watermark:', err);
  }

  // 3. Draw each element
  for (const element of template.elements) {
    // Convert % coordinates to actual pixel coordinates
    let elX = (element.x / 100) * baseWidth;
    let elY = (element.y / 100) * baseHeight;
    let elWidth = element.width ? (element.width / 100) * baseWidth : undefined;
    let elHeight = element.height ? (element.height / 100) * baseHeight : undefined;

    // Defensive check: if date element is located on the right (x > 45) overlapping signature area
    if ((element.field === '{{DATE}}' || element.id === 'elem-date') && element.x > 45) {
      elX = (15.6 / 100) * baseWidth;
      elY = (78 / 100) * baseHeight;
      elWidth = (16.7 / 100) * baseWidth;
    }

    if (element.type === 'qr' || element.field === '{{QR_CODE}}') {
      // Draw QR code with embedded mark verification data
      const certNum = student.certificateNumber || 'IYT-2026-0001';
      const baseUrl = settings.verificationBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      let verifyUrl = `${baseUrl.replace(/\/$/, '')}/verify?id=${encodeURIComponent(certNum)}`;

      // Attach detailed mark breakdown if available
      if (student.marks) {
        const m = student.marks;
        const bOptVal = m.partB.optional !== undefined && m.partB.optional !== '' && m.partB.optional !== null ? m.partB.optional : 0;
        verifyUrl += `&marks=1` +
          `&m_a=${encodeURIComponent(m.partA.total)}` +
          `&a1=${encodeURIComponent(m.partA.col1 ?? '')}` +
          `&a2=${encodeURIComponent(m.partA.col2 ?? '')}` +
          `&a3=${encodeURIComponent(m.partA.col3 ?? '')}` +
          `&b1=${encodeURIComponent(m.partB.col1 ?? '')}` +
          `&b2=${encodeURIComponent(m.partB.col2 ?? '')}` +
          `&b_opt=${encodeURIComponent(String(bOptVal))}` +
          `&m_b=${encodeURIComponent(m.partB.total)}` +
          `&tot=${encodeURIComponent(m.grandTotal)}` +
          `&max=${encodeURIComponent(m.maxMarks)}` +
          `&pct=${encodeURIComponent(m.percentage)}` +
          `&grd=${encodeURIComponent(m.grade)}` +
          `&res=${encodeURIComponent(m.status)}`;
      }

      const qrWidth = elWidth || 140;
      const qrHeight = elHeight || qrWidth;

      try {
        const qrDataUrl = await generateQrDataUrl(verifyUrl, Math.round(qrWidth * 2));
        if (qrDataUrl) {
          const qrImg = await loadImage(qrDataUrl);
          ctx.drawImage(qrImg, elX, elY, qrWidth, qrHeight);
        }
      } catch (err) {
        console.error('Failed to draw QR code on certificate:', err);
      }
      continue;
    }

    if (element.type === 'image' || element.field === '{{SIGNATURE}}') {
      // Draw digital / uploaded e-signature (clean signature only, strictly no subtitles)
      const sigSrc = element.imageUrl || settings.signatureUrl || createDefaultSignatureSvg();
      const sigWidth = elWidth || 280;
      const sigHeight = elHeight || 105;
      try {
        const sigImg = await loadImage(sigSrc);
        const imgW = sigImg.naturalWidth || sigImg.width || 280;
        const imgH = sigImg.naturalHeight || sigImg.height || 105;
        const imgAspect = imgW / (imgH || 1);
        let renderW = sigWidth;
        let renderH = sigHeight;
        if (imgAspect > 0) {
          if (sigWidth / sigHeight > imgAspect) {
            renderW = sigHeight * imgAspect;
          } else {
            renderH = sigWidth / imgAspect;
          }
        }
        // Align cleanly above the baseline without touching or overflowing
        const lineBaselineY = (910 / 1080) * baseHeight;
        const targetBottom = (elY + sigHeight >= lineBaselineY - 60 && elY + sigHeight <= lineBaselineY + 60)
          ? lineBaselineY - 5
          : elY + sigHeight;
        const offsetX = elX + (sigWidth - renderW) / 2;
        const offsetY = targetBottom - renderH;
        ctx.drawImage(sigImg, offsetX, offsetY, renderW, renderH);
      } catch (err) {
        console.warn('Failed to draw signature image:', err);
      }
      continue;
    }

    // Strictly suppress any subtitle, signer designation, signer name, or text below the signature
    const isSignerSubtitle =
      element.field === '{{SIGNER_TITLE}}' ||
      element.field === '{{SIGNER_NAME}}' ||
      element.id === 'elem-signer-title' ||
      element.id === 'elem-signer-name' ||
      element.id === 'elem-signer' ||
      (element.label && /signer|signatory|subtitle/i.test(element.label)) ||
      (element.sampleText && /signatory|director|authorized signer/i.test(element.sampleText)) ||
      (element.type === 'text' && element.y >= 82 && element.x >= 60);

    if (isSignerSubtitle) {
      continue;
    }

    // Suppress any legacy or custom logo element placed in the top area (y < 50) as requested ("Don't place logo in the top")
    const isTopLogo =
      (element.field === '{{COMPANY_LOGO}}' || element.id === 'elem-logo' || (element.label && /logo/i.test(element.label))) &&
      element.y < 50;

    if (isTopLogo) {
      continue;
    }

    // Text rendering
    let textToDraw = element.field;
    if (element.sampleText && !textToDraw.includes('{{')) {
      textToDraw = element.sampleText;
    }
    textToDraw = replacePlaceholders(textToDraw, student, settings);

    ctx.save();

    const fontStyle = element.fontStyle || 'normal';
    const fontWeight = element.fontWeight || 'normal';
    const fontSize = element.fontSize || 32;
    const fontFamily = element.fontFamily || 'Inter';

    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}, sans-serif`;
    ctx.fillStyle = element.color || '#0F172A';
    ctx.textBaseline = 'top';

    const align = element.textAlign || 'left';
    ctx.textAlign = align;

    let targetX = elX;
    if (align === 'center' && elWidth) {
      targetX = elX + elWidth / 2;
    } else if (align === 'right' && elWidth) {
      targetX = elX + elWidth;
    }

    ctx.fillText(textToDraw, targetX, elY);
    ctx.restore();
  }

  // If template has no QR element, guarantee QR code for certificates with marks
  const hasQrDrawn = template.elements.some((el) => el.type === 'qr' || el.field === '{{QR_CODE}}');
  if (!hasQrDrawn && student.marks) {
    const certNum = student.certificateNumber || 'IYT-2026-0001';
    const baseUrl = settings.verificationBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    let verifyUrl = `${baseUrl.replace(/\/$/, '')}/verify?id=${encodeURIComponent(certNum)}`;
    const m = student.marks;
    const bOptVal = m.partB.optional !== undefined && m.partB.optional !== '' && m.partB.optional !== null ? m.partB.optional : 0;
    verifyUrl += `&marks=1` +
      `&m_a=${encodeURIComponent(m.partA.total)}` +
      `&a1=${encodeURIComponent(m.partA.col1 ?? '')}` +
      `&a2=${encodeURIComponent(m.partA.col2 ?? '')}` +
      `&a3=${encodeURIComponent(m.partA.col3 ?? '')}` +
      `&b1=${encodeURIComponent(m.partB.col1 ?? '')}` +
      `&b2=${encodeURIComponent(m.partB.col2 ?? '')}` +
      `&b_opt=${encodeURIComponent(String(bOptVal))}` +
      `&m_b=${encodeURIComponent(m.partB.total)}` +
      `&tot=${encodeURIComponent(m.grandTotal)}` +
      `&max=${encodeURIComponent(m.maxMarks)}` +
      `&pct=${encodeURIComponent(m.percentage)}` +
      `&grd=${encodeURIComponent(m.grade)}` +
      `&res=${encodeURIComponent(m.status)}`;

    const qrWidth = 140;
    const qrHeight = 140;
    const elX = baseWidth / 2 - qrWidth / 2;
    const elY = baseHeight - qrHeight - 40;

    try {
      const qrDataUrl = await generateQrDataUrl(verifyUrl, Math.round(qrWidth * 2));
      if (qrDataUrl) {
        const qrImg = await loadImage(qrDataUrl);
        ctx.drawImage(qrImg, elX, elY, qrWidth, qrHeight);
      }
    } catch (err) {
      console.error('Failed to draw fallback QR code on certificate:', err);
    }
  }

  // If template has no signature element, guarantee signature is drawn cleanly without overlapping
  const hasSigDrawn = template.elements.some((el) => el.type === 'image' || el.field === '{{SIGNATURE}}');
  if (!hasSigDrawn && settings.signatureUrl) {
    const sigSrc = settings.signatureUrl;
    const sigWidth = 260;
    const sigHeight = 95;
    // Align cleanly above the right baseline (x: 1300-1620, baseline at y: 910)
    const elX = 1330;
    const targetBottom = 905;
    try {
      const sigImg = await loadImage(sigSrc);
      const imgW = sigImg.naturalWidth || sigImg.width || 260;
      const imgH = sigImg.naturalHeight || sigImg.height || 95;
      const imgAspect = imgW / (imgH || 1);
      let renderW = sigWidth;
      let renderH = sigHeight;
      if (imgAspect > 0) {
        if (sigWidth / sigHeight > imgAspect) {
          renderW = sigHeight * imgAspect;
        } else {
          renderH = sigWidth / imgAspect;
        }
      }
      ctx.drawImage(sigImg, elX + (sigWidth - renderW) / 2, targetBottom - renderH, renderW, renderH);
    } catch (err) {
      console.warn('Failed to draw fallback signature image:', err);
    }
  }

  // --- MANDATORY OFFICIAL BRAND LOGO ON EVERY CERTIFICATE (IN FOOTER/BOTTOM, NOT TOP) ---
  // Positioned as an official institutional seal in the bottom area cleanly without overlapping signature, date, or QR
  try {
    const logoImg = await loadImage(settings.logoUrl || OFFICIAL_LOGO_DATA_URL);
    const logoSize = 100;

    // Check if QR code is at the bottom center (x between 35% and 65%, y > 65%)
    const hasCenterQr = template.elements.some(
      (el) => (el.type === 'qr' || el.field === '{{QR_CODE}}') && el.x > 35 && el.x < 65 && el.y > 65
    );

    let logoX: number;
    let logoY: number;

    if (hasCenterQr) {
      // Place brand logo cleanly in the open space between the left date block (ends at ~620px) and center QR (starts at ~892px)
      // Centered at x: 720px, y: 76% (~820px)
      logoX = 720;
      logoY = Math.round(baseHeight * 0.76);
    } else {
      // Cleanly in bottom center
      logoX = (baseWidth - logoSize) / 2;
      logoY = Math.round(baseHeight * 0.77);
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 6;
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();
  } catch (err) {
    console.warn('Failed to draw official brand logo in certificate footer:', err);
  }

  ctx.restore();
}

export async function exportCertificateAsDataUrl(
  template: CertificateTemplate,
  student: StudentRecord,
  settings: CompanySettings,
  format: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<string> {
  const offscreenCanvas = document.createElement('canvas');
  await renderCertificateToCanvas(offscreenCanvas, template, student, settings, { scale: 1 });
  return offscreenCanvas.toDataURL(format, 0.95);
}

export async function exportCertificateAsBlob(
  template: CertificateTemplate,
  student: StudentRecord,
  settings: CompanySettings,
  format: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<Blob> {
  const offscreenCanvas = document.createElement('canvas');
  await renderCertificateToCanvas(offscreenCanvas, template, student, settings, { scale: 1 });
  return new Promise((resolve, reject) => {
    offscreenCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob from canvas'));
      },
      format,
      0.95
    );
  });
}
