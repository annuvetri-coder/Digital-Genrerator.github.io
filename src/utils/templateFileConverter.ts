import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for browser execution
if (typeof window !== 'undefined') {
  try {
    // Vite resolves worker URL properly in bundle and dev
    const workerUrl = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

export interface ConvertedTemplateFile {
  dataUrl: string;
  width: number;
  height: number;
  name: string;
  isPdf: boolean;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file from disk'));
    reader.readAsDataURL(file);
  });
}

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 1920,
        height: img.naturalHeight || 1080,
      });
    };
    img.onerror = () => reject(new Error('Invalid image data. Please ensure the file is an intact image.'));
    img.src = dataUrl;
  });
}

/**
 * Converts a PDF file (page 1) to a high-resolution PNG image data URL.
 */
export async function convertPdfToImageDataUrl(file: File): Promise<ConvertedTemplateFile> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });

  const pdfDoc = await loadingTask.promise;
  if (pdfDoc.numPages === 0) {
    throw new Error('The uploaded PDF does not contain any readable pages.');
  }

  const page = await pdfDoc.getPage(1);
  const baseViewport = page.getViewport({ scale: 1.0 });

  // Compute scale so width is at least 1920px for high-definition certificate printing
  const targetWidth = 1920;
  const scale = Math.max(targetWidth / baseViewport.width, 2.0);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create off-screen canvas for PDF processing.');
  }

  // Draw white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvas,
    canvasContext: ctx,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  const dataUrl = canvas.toDataURL('image/png', 0.95);
  const cleanName = file.name.replace(/\.[^/.]+$/, '').trim();

  return {
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    name: cleanName || 'Uploaded PDF Template',
    isPdf: true,
  };
}

/**
 * Validates and converts any supported file (PNG, JPG, JPEG, WEBP, SVG, or PDF)
 * into a high-resolution image data URL suitable for canvas backgrounds.
 */
export async function processTemplateFile(file: File): Promise<ConvertedTemplateFile> {
  const fileName = file.name.toLowerCase();
  const fileType = (file.type || '').toLowerCase();

  const isPdf = fileType.includes('pdf') || fileName.endsWith('.pdf');
  const isImage =
    fileType.startsWith('image/') ||
    /\.(png|jpe?g|webp|svg|bmp)$/i.test(fileName);

  if (!isPdf && !isImage) {
    throw new Error(
      `Unsupported file format (${file.name}). Please upload a valid certificate image (PNG, JPG, WEBP, SVG) or PDF document.`
    );
  }

  // File size guard (e.g. 35MB max)
  const MAX_SIZE_BYTES = 35 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(
      `The file is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please upload a file smaller than 35 MB.`
    );
  }

  if (isPdf) {
    return await convertPdfToImageDataUrl(file);
  }

  // Standard Image Handling
  const dataUrl = await readFileAsDataUrl(file);
  const { width, height } = await loadImageDimensions(dataUrl);
  const cleanName = file.name.replace(/\.[^/.]+$/, '').trim();

  return {
    dataUrl,
    width,
    height,
    name: cleanName || 'Uploaded Custom Template',
    isPdf: false,
  };
}
