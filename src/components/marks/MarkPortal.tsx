import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  Edit2,
  Eraser,
  ExternalLink,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  PenTool,
  Percent,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UploadCloud,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  CertificateBatch,
  CertificateRecord,
  CertificateTemplate,
  MarkSession,
  StudentMarkEntry,
  StudentRecord,
} from '../../types';
import { api } from '../../services/api';
import {
  computeStudentMarkEntry,
  createDefaultMarkSession,
} from '../../utils/markSessionHelper';
import { useSettings } from '../../context/SettingsContext';
import { PRESET_TEMPLATES, createDefaultSignatureSvg } from '../../utils/defaultTemplates';
import { renderCertificateToCanvas } from '../../utils/canvasRenderer';
import {
  downloadSingleCertificate,
  generateBulkCertificatesZip,
} from '../../utils/pdfGenerator';
import { useAuth } from '../../context/AuthContext';
import { CompanyLogo } from '../CompanyLogo';

interface MarkPortalProps {
  onBackToMain: () => void;
  onGenerateCertificatesForBatch?: (batchCode: string, studentNames: string[]) => void;
}

export const MarkPortal: React.FC<MarkPortalProps> = ({
  onBackToMain,
  onGenerateCertificatesForBatch,
}) => {
  const { settings, updateSettings } = useSettings();
  const { isCompanyAuthorized, authorizedCompanyEmail, isAuthenticated, login } = useAuth();
  const [sessions, setSessions] = useState<MarkSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<MarkSession | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASS' | 'FAIL' | 'ABSENT'>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Certificate with Marks QR Code states
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedCertStudentId, setSelectedCertStudentId] = useState<string>('');
  const [templates, setTemplates] = useState<CertificateTemplate[]>(PRESET_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(PRESET_TEMPLATES[0].id);
  const [isPreviewRendering, setIsPreviewRendering] = useState(false);
  const [isGeneratingBulkCertificates, setIsGeneratingBulkCertificates] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ completed: number; total: number; currentStudent: string }>({
    completed: 0,
    total: 0,
    currentStudent: '',
  });
  const [registeredNotice, setRegisteredNotice] = useState<string | null>(null);
  const certCanvasRef = useRef<HTMLCanvasElement>(null);

  // E-Signature upload & interactive draw states
  const [isSigDrawModalOpen, setIsSigDrawModalOpen] = useState(false);
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const [signerNameInput, setSignerNameInput] = useState(settings.signerName || 'Authorized Signatory');
  const [signerTitleInput, setSignerTitleInput] = useState(settings.signerTitle || 'Director / Controller of Examinations');
  const [sigNotice, setSigNotice] = useState<string | null>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);
  const sigCanvasDrawRef = useRef<HTMLCanvasElement>(null);

  const excelImportInputRef = useRef<HTMLInputElement>(null);

  // Load Sessions and Templates
  const loadSessions = async () => {
    try {
      const data = await api.getMarkSessions();
      setSessions(data);
      if (data.length > 0) {
        const current = data.find((s) => s.id === activeSessionId) || data[0];
        setActiveSessionId(current.id);
        setActiveSession(current);
      } else {
        const def = createDefaultMarkSession();
        setSessions([def]);
        setActiveSessionId(def.id);
        setActiveSession(def);
      }
    } catch (err) {
      console.error('Failed to load mark sessions:', err);
    }

    try {
      const tmpls = await api.getTemplates();
      if (tmpls && tmpls.length > 0) {
        setTemplates(tmpls);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Update activeSession when activeSessionId changes
  useEffect(() => {
    const found = sessions.find((s) => s.id === activeSessionId);
    if (found) {
      setActiveSession(found);
    }
  }, [activeSessionId, sessions]);

  // Convert a StudentMarkEntry to StudentRecord with marks for certificate rendering
  const convertStudentToRecord = (student: StudentMarkEntry, session: MarkSession): StudentRecord => {
    return {
      id: student.id,
      serialNo: student.serialNo,
      studentName: student.studentName,
      courseName: session.subjectName || session.name,
      issueDate: session.sessionDate || new Date().toLocaleDateString(),
      certificateNumber: student.studentId || `IYT-2026-${String(student.serialNo).padStart(4, '0')}`,
      verificationId: `VRF-${student.studentId || student.serialNo}`,
      marks: {
        partA: {
          col1: student.partA.col1,
          col2: student.partA.col2,
          col3: student.partA.col3,
          total: student.partA.total,
        },
        partB: {
          col1: student.partB.col1,
          col2: student.partB.col2,
          optional: student.partB.optional,
          total: student.partB.total,
        },
        partC: student.partC,
        grandTotal: student.grandTotal,
        maxMarks: student.maxMarks,
        percentage: student.percentage,
        grade: student.grade,
        status: student.status,
      },
      extraFields: {
        MARKS: `${student.grandTotal}/${student.maxMarks}`,
        GRADE: student.grade,
        PERCENTAGE: `${student.percentage}%`,
        PART_A_MARKS: `${student.partA.total}/60`,
        PART_B_MARKS: `${student.partB.total}`,
      },
      status: 'valid',
    };
  };

  // Re-render certificate preview canvas whenever student, template or modal state changes
  useEffect(() => {
    if (!showCertModal || !certCanvasRef.current || !activeSession) return;
    const student =
      activeSession.students.find((s) => s.id === selectedCertStudentId) ||
      activeSession.students[0];
    if (!student) return;

    const template =
      templates.find((t) => t.id === selectedTemplateId) ||
      PRESET_TEMPLATES[0];

    const studentRecord = convertStudentToRecord(student, activeSession);
    setIsPreviewRendering(true);
    renderCertificateToCanvas(
      certCanvasRef.current,
      template,
      studentRecord,
      settings,
      { scale: 0.65 }
    )
      .catch((err) => console.error('Canvas preview error:', err))
      .finally(() => setIsPreviewRendering(false));
  }, [
    showCertModal,
    selectedCertStudentId,
    selectedTemplateId,
    activeSession,
    templates,
    settings,
  ]);

  // Support pasting signature image directly anywhere via Ctrl+V / Cmd+V
  useEffect(() => {
    if (!showCertModal) return;
    const handlePaste = (e: ClipboardEvent) => {
      if (!isCompanyAuthorized) {
        alert(`Only you (authorized company email: ${authorizedCompanyEmail}) can paste or modify the signature.`);
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const dataUrl = event.target?.result as string;
              await updateSettings({ ...settings, signatureUrl: dataUrl });
              setSigNotice('E-Signature pasted from clipboard and applied to certificates!');
              setTimeout(() => setSigNotice(null), 3500);
            };
            reader.readAsDataURL(blob);
            e.preventDefault();
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showCertModal, settings, updateSettings, isCompanyAuthorized, authorizedCompanyEmail]);

  // Test Scan QR Code directly to open the verification portal in a new tab
  const handleTestScanQr = (student: StudentMarkEntry) => {
    if (!activeSession) return;
    const certNum = student.studentId || `IYT-2026-${String(student.serialNo).padStart(4, '0')}`;
    const baseUrl = settings.verificationBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const bOptVal = student.partB.optional !== undefined && student.partB.optional !== '' && student.partB.optional !== null ? student.partB.optional : 0;
    const verifyUrl = `${baseUrl.replace(/\/$/, '')}/verify?id=${encodeURIComponent(certNum)}&marks=1` +
      `&m_a=${encodeURIComponent(student.partA.total)}` +
      `&a1=${encodeURIComponent(student.partA.col1 ?? '')}` +
      `&a2=${encodeURIComponent(student.partA.col2 ?? '')}` +
      `&a3=${encodeURIComponent(student.partA.col3 ?? '')}` +
      `&b1=${encodeURIComponent(student.partB.col1 ?? '')}` +
      `&b2=${encodeURIComponent(student.partB.col2 ?? '')}` +
      `&b_opt=${encodeURIComponent(String(bOptVal))}` +
      `&m_b=${encodeURIComponent(student.partB.total)}` +
      `&tot=${encodeURIComponent(student.grandTotal)}` +
      `&max=${encodeURIComponent(student.maxMarks)}` +
      `&pct=${encodeURIComponent(student.percentage)}` +
      `&grd=${encodeURIComponent(student.grade)}` +
      `&res=${encodeURIComponent(student.status)}`;
    window.open(verifyUrl, '_blank');
  };

  // Download Single Certificate as PNG
  const handleDownloadSinglePng = async () => {
    if (!isCompanyAuthorized) {
      alert(`Certificate generation is restricted to the authorized company account (${authorizedCompanyEmail}). Please sign in with your company email.`);
      return;
    }
    if (!activeSession) return;
    const student =
      activeSession.students.find((s) => s.id === selectedCertStudentId) ||
      activeSession.students[0];
    if (!student) return;

    const template =
      templates.find((t) => t.id === selectedTemplateId) ||
      PRESET_TEMPLATES[0];
    const studentRecord = convertStudentToRecord(student, activeSession);

    const offscreenCanvas = document.createElement('canvas');
    await renderCertificateToCanvas(offscreenCanvas, template, studentRecord, settings, { scale: 1 });
    const dataUrl = offscreenCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${student.studentName.replace(/\s+/g, '_')}_Marks_Certificate.png`;
    link.click();
  };

  // Download Single Certificate as PDF
  const handleDownloadSinglePdf = async () => {
    if (!isCompanyAuthorized) {
      alert(`Certificate generation is restricted to the authorized company account (${authorizedCompanyEmail}). Please sign in with your company email.`);
      return;
    }
    if (!activeSession) return;
    const student =
      activeSession.students.find((s) => s.id === selectedCertStudentId) ||
      activeSession.students[0];
    if (!student) return;

    const template =
      templates.find((t) => t.id === selectedTemplateId) ||
      PRESET_TEMPLATES[0];
    const studentRecord = convertStudentToRecord(student, activeSession);
    await downloadSingleCertificate(template, studentRecord, settings);
  };

  // Bulk Generate & Download All Certificates as ZIP
  const handleBulkDownloadZip = async () => {
    if (!isCompanyAuthorized) {
      alert(`Bulk certificate generation is restricted to the authorized company account (${authorizedCompanyEmail}). Please sign in with your company email.`);
      return;
    }
    if (!activeSession || !activeSession.students.length) return;
    setIsGeneratingBulkCertificates(true);
    try {
      const template =
        templates.find((t) => t.id === selectedTemplateId) ||
        PRESET_TEMPLATES[0];
      const records = activeSession.students.map((s) => convertStudentToRecord(s, activeSession));
      const { zipBlob } = await generateBulkCertificatesZip({
        template,
        students: records,
        settings,
        format: 'pdf',
        onProgress: (completed, total, currentStudent) => {
          setBulkProgress({ completed, total, currentStudent });
        },
      });

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeSession.batchCode || 'Session'}_Certificates_with_Marks.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      alert('Failed to generate ZIP: ' + err.message);
    } finally {
      setIsGeneratingBulkCertificates(false);
    }
  };

  // Register Batch and all certificates with marks to the main Certificate Management System
  const handleRegisterBatchToPlatform = async () => {
    if (!activeSession) return;
    const template =
      templates.find((t) => t.id === selectedTemplateId) ||
      PRESET_TEMPLATES[0];
    const records = activeSession.students.map((s) => convertStudentToRecord(s, activeSession));
    const batchId = activeSession.batchCode || `IYT-BATCH-${Date.now()}`;
    const newBatch: CertificateBatch = {
      id: `batch-${Date.now()}`,
      batchId,
      name: activeSession.name,
      courseName: activeSession.subjectName,
      studentCount: records.length,
      templateId: template.id,
      templateName: template.name,
      issueDate: activeSession.sessionDate,
      createdAt: new Date().toISOString(),
      students: records,
    };

    await api.saveBatch(newBatch);

    const certRecords: CertificateRecord[] = records.map((r) => ({
      id: `cert-${r.certificateNumber}`,
      certificateNumber: r.certificateNumber,
      studentName: r.studentName,
      courseName: r.courseName,
      issueDate: r.issueDate,
      batchId: newBatch.batchId,
      batchName: newBatch.name,
      templateId: newBatch.templateId,
      verificationId: r.verificationId,
      marks: r.marks,
      status: 'valid',
      createdAt: new Date().toISOString(),
    }));

    await api.saveCertificatesBulk(certRecords);
    setRegisteredNotice(`Batch "${newBatch.batchId}" and ${certRecords.length} certificates registered to Registry!`);
    setTimeout(() => setRegisteredNotice(null), 4000);
  };

  // Handle E-Signature Image File Upload
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCompanyAuthorized) {
      alert(`Only you (authorized company email: ${authorizedCompanyEmail}) have permission to upload or paste the certificate signature.`);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image')) {
      alert('Please upload a valid image file (PNG, JPG, or SVG) for the e-signature.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await updateSettings({ ...settings, signatureUrl: dataUrl });
      setSigNotice('E-Signature uploaded and applied to certificates!');
      setTimeout(() => setSigNotice(null), 3500);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Interactive Signature Pad Drawing Handlers
  const startSigDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasDrawRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawingSig(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawSig = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasDrawRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F172A'; // Ink color
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopSigDraw = () => {
    setIsDrawingSig(false);
  };

  const clearSigPad = () => {
    const canvas = sigCanvasDrawRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawnSignature = async () => {
    const canvas = sigCanvasDrawRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    await updateSettings({ ...settings, signatureUrl: dataUrl });
    setIsSigDrawModalOpen(false);
    setSigNotice('Hand-drawn e-signature saved and applied to certificates!');
    setTimeout(() => setSigNotice(null), 3500);
  };

  const handleResetSignature = async () => {
    await updateSettings({ ...settings, signatureUrl: '' });
    setSigNotice('Signature reset to official default template.');
    setTimeout(() => setSigNotice(null), 3500);
  };

  // Dedicated Paste from Clipboard handler
  const handlePasteFromClipboard = async () => {
    if (!isCompanyAuthorized) {
      alert(`Only you (authorized company email: ${authorizedCompanyEmail}) can paste the issuer signature.`);
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const reader = new FileReader();
              reader.onload = async (e) => {
                const dataUrl = e.target?.result as string;
                await updateSettings({ ...settings, signatureUrl: dataUrl });
                setSigNotice('Signature pasted from clipboard and applied to certificates!');
                setTimeout(() => setSigNotice(null), 3500);
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
      }
      alert('No image detected in clipboard. Copy an image or screenshot first, or press Ctrl+V directly on screen.');
    } catch (err) {
      console.warn('Clipboard read error:', err);
      alert('Press Ctrl+V (or Cmd+V on Mac) anywhere on this screen to paste your signature image directly.');
    }
  };

  // Drag & drop image file onto signature box
  const handleSigDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isCompanyAuthorized) {
      alert(`Only you (authorized company email: ${authorizedCompanyEmail}) can apply or drop signatures.`);
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.includes('image')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        await updateSettings({ ...settings, signatureUrl: dataUrl });
        setSigNotice('Signature image dropped and applied to certificates!');
        setTimeout(() => setSigNotice(null), 3500);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Mark Cell Change for Part A (columns 1, 2, 3), Part B (1, 2, optional), or Part C
  const handleMarkChange = (
    studentId: string,
    section:
      | 'partA_col1'
      | 'partA_col2'
      | 'partA_col3'
      | 'partB_col1'
      | 'partB_col2'
      | 'partB_optional'
      | 'partB'
      | 'partC',
    value: string
  ) => {
    if (!activeSession) return;

    const numVal = value === '' ? '' : Math.max(0, Number(value));

    const updatedStudents = activeSession.students.map((student) => {
      if (student.id !== studentId) return student;

      const updatedRaw = {
        ...student,
        partA: { ...student.partA },
        partB: { ...student.partB },
        partC: student.partC ? { ...student.partC } : { marks: '' as number | '', title: 'Viva / Practical' },
      };

      if (section === 'partA_col1') updatedRaw.partA!.col1 = numVal;
      if (section === 'partA_col2') updatedRaw.partA!.col2 = numVal;
      if (section === 'partA_col3') updatedRaw.partA!.col3 = numVal;

      if (section === 'partB_col1') updatedRaw.partB!.col1 = numVal;
      if (section === 'partB_col2') updatedRaw.partB!.col2 = numVal;
      if (section === 'partB_optional') updatedRaw.partB!.optional = numVal;
      if (section === 'partB') {
        const val = numVal === '' ? 0 : Number(numVal);
        updatedRaw.partB!.col1 = Math.min(20, Math.floor(val / 2));
        updatedRaw.partB!.col2 = Math.min(20, val - Number(updatedRaw.partB!.col1));
      }

      if (section === 'partC') updatedRaw.partC!.marks = numVal;

      return computeStudentMarkEntry(updatedRaw, activeSession);
    });

    const updatedSession: MarkSession = {
      ...activeSession,
      students: updatedStudents,
      updatedAt: new Date().toISOString(),
    };

    setActiveSession(updatedSession);
    // Auto-save in background
    api.saveMarkSession(updatedSession);
  };

  // Toggle Part B Optional 5 Marks for the entire session
  const handleTogglePartBOptional = () => {
    if (!activeSession) return;
    const isNowEnabled = !activeSession.partBConfig.isOptionalEnabled;

    const updatedConfig = {
      ...activeSession.partBConfig,
      isOptionalEnabled: isNowEnabled,
      maxTotal: isNowEnabled ? 45 : 40,
    };

    const recomputedStudents = activeSession.students.map((s) =>
      computeStudentMarkEntry(s, {
        ...activeSession,
        partBConfig: updatedConfig,
      })
    );

    const updatedSession: MarkSession = {
      ...activeSession,
      partBConfig: updatedConfig,
      students: recomputedStudents,
      updatedAt: new Date().toISOString(),
    };

    setActiveSession(updatedSession);
    setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
    api.saveMarkSession(updatedSession);
  };

  // Toggle Absent Status
  const handleToggleAbsent = (studentId: string) => {
    if (!activeSession) return;

    const updatedStudents = activeSession.students.map((student) => {
      if (student.id !== studentId) return student;
      const isAbsent = !student.isAbsent;
      return computeStudentMarkEntry(
        {
          ...student,
          isAbsent,
        },
        activeSession
      );
    });

    const updatedSession = { ...activeSession, students: updatedStudents };
    setActiveSession(updatedSession);
    api.saveMarkSession(updatedSession);
  };

  // Toggle Part C (Optional) for the entire session
  const handleTogglePartC = () => {
    if (!activeSession) return;
    const isNowEnabled = !activeSession.partCConfig.isEnabled;

    const updatedConfig = {
      ...activeSession.partCConfig,
      isEnabled: isNowEnabled,
    };

    const recomputedStudents = activeSession.students.map((s) =>
      computeStudentMarkEntry(s, {
        ...activeSession,
        partCConfig: updatedConfig,
      })
    );

    const updatedSession: MarkSession = {
      ...activeSession,
      partCConfig: updatedConfig,
      students: recomputedStudents,
      updatedAt: new Date().toISOString(),
    };

    setActiveSession(updatedSession);
    setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
    api.saveMarkSession(updatedSession);
  };

  // Create New Session
  const handleCreateNewSession = () => {
    const newSession: MarkSession = {
      id: `session-${Date.now()}`,
      name: `Mark Assessment Session — ${new Date().toLocaleDateString()}`,
      subjectName: 'Technical Course Assessment',
      batchCode: 'IYT-BATCH-2026',
      sessionDate: new Date().toISOString().slice(0, 10),
      evaluatorName: 'Authorized Faculty',
      partAConfig: {
        maxTotal: 60,
        col1Max: 20,
        col1Label: '1',
        col2Max: 20,
        col2Label: '2',
        col3Max: 20,
        col3Label: '3',
      },
      partBConfig: {
        maxTotal: 40,
        col1Max: 20,
        col1Label: '1',
        col2Max: 20,
        col2Label: '2',
        optionalMax: 5,
        optionalLabel: 'Optional',
        isOptionalEnabled: false,
        label: 'Part B (1 & 2 @ 20M, Optional @ 5M)',
      },
      partCConfig: {
        isOptional: true,
        isEnabled: false,
        maxMarks: 20,
        label: 'Part C (Optional Viva / Practical)',
      },
      passingPercentage: 50,
      students: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveSession(newSession);
    api.saveMarkSession(newSession);
    setShowConfigModal(true);
  };

  // Delete Session
  const handleDeleteSession = async (id: string) => {
    if (confirm('Delete this entire Mark Session and all student evaluation scores?')) {
      await api.deleteMarkSession(id);
      const remaining = sessions.filter((s) => s.id !== id);
      setSessions(remaining);
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        setActiveSession(remaining[0]);
      } else {
        const def = createDefaultMarkSession();
        setSessions([def]);
        setActiveSessionId(def.id);
        setActiveSession(def);
      }
    }
  };

  // Add Student to Active Session
  const handleAddStudent = () => {
    if (!activeSession || !newStudentName.trim()) return;

    const nextSerial = activeSession.students.length + 1;
    const stdId = newStudentId.trim() || `IYT-2026-${String(nextSerial).padStart(3, '0')}`;

    const newStudent = computeStudentMarkEntry(
      {
        id: `stu-${Date.now()}`,
        serialNo: nextSerial,
        studentId: stdId,
        studentName: newStudentName.trim(),
        partA: { col1: '', col2: '', col3: '', total: 0 },
        partB: { marks: '', total: 0 },
        partC: { marks: '', title: 'Viva / Practical' },
      },
      activeSession
    );

    const updatedSession = {
      ...activeSession,
      students: [...activeSession.students, newStudent],
      updatedAt: new Date().toISOString(),
    };

    setActiveSession(updatedSession);
    setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
    api.saveMarkSession(updatedSession);

    setNewStudentName('');
    setNewStudentId('');
    setShowAddStudentModal(false);
  };

  // Remove Student
  const handleRemoveStudent = (studentId: string) => {
    if (!activeSession) return;
    if (confirm('Remove student from mark list?')) {
      const updatedStudents = activeSession.students
        .filter((s) => s.id !== studentId)
        .map((s, idx) => ({ ...s, serialNo: idx + 1 }));

      const updatedSession = { ...activeSession, students: updatedStudents };
      setActiveSession(updatedSession);
      setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
      api.saveMarkSession(updatedSession);
    }
  };

  // Save Session Explicitly
  const handleManualSave = async () => {
    if (!activeSession) return;
    setIsSaving(true);
    await api.saveMarkSession(activeSession);
    setIsSaving(false);
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 2500);
  };

  // Export Tabulation Mark Sheet to Excel
  const handleExportExcel = () => {
    if (!activeSession) return;

    const rows = activeSession.students.map((s) => ({
      'S.No': s.serialNo,
      'Student ID': s.studentId,
      'Student Name': s.studentName,
      'Part A - Col 1 (/20)': s.partA.col1,
      'Part A - Col 2 (/20)': s.partA.col2,
      'Part A - Col 3 (/20)': s.partA.col3,
      'Part A Total (/60)': s.partA.total,
      'Part B - 1 (/20)': s.partB.col1,
      'Part B - 2 (/20)': s.partB.col2,
      'Part B - Optional (/5)': s.partB.optional ?? '',
      'Part B Total': s.partB.total,
      ...(activeSession.partCConfig.isEnabled
        ? { 'Part C - Optional (/20)': s.partC?.marks ?? '' }
        : {}),
      'Grand Total': s.grandTotal,
      'Max Marks': s.maxMarks,
      'Percentage (%)': s.percentage,
      'Grade': s.grade,
      'Result': s.status,
      'Remarks': s.remarks || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mark Sheet');
    XLSX.writeFile(
      workbook,
      `${activeSession.batchCode || 'Session'}_Marks_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Download Blank Excel Mark Template
  const handleDownloadBlankTemplate = () => {
    const blankRows = [
      {
        'Student ID': 'IYT-2026-001',
        'Student Name': 'Sample Candidate A',
        'Part A - 1 (Max 20)': 18,
        'Part A - 2 (Max 20)': 19,
        'Part A - 3 (Max 20)': 17,
        'Part B - 1 (Max 20)': 18,
        'Part B - 2 (Max 20)': 18,
        'Part B - Optional (Max 5)': 4,
        'Part C - Optional (Max 20)': 18,
      },
      {
        'Student ID': 'IYT-2026-002',
        'Student Name': 'Sample Candidate B',
        'Part A - 1 (Max 20)': 15,
        'Part A - 2 (Max 20)': 16,
        'Part A - 3 (Max 20)': 18,
        'Part B - 1 (Max 20)': 16,
        'Part B - 2 (Max 20)': 16,
        'Part B - Optional (Max 5)': 3,
        'Part C - Optional (Max 20)': 16,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(blankRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students Marks Template');
    XLSX.writeFile(workbook, 'Mark_Session_Upload_Template.xlsx');
  };

  // Import Excel Mark Sheet
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        let sheet = workbook.Sheets[workbook.SheetNames[0]];
        let json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        if (!json.length && workbook.SheetNames.length > 1) {
          for (let s = 1; s < workbook.SheetNames.length; s++) {
            const nextSheet = workbook.Sheets[workbook.SheetNames[s]];
            const nextJson = XLSX.utils.sheet_to_json<Record<string, any>>(nextSheet);
            if (nextJson.length > 0) {
              json = nextJson;
              break;
            }
          }
        }

        if (!json.length) {
          alert('Excel spreadsheet is empty or has no readable rows.');
          return;
        }

        // Helper to find matching cell in row
        const findVal = (rowObj: Record<string, any>, possibleKeys: string[]): any => {
          for (const key of Object.keys(rowObj)) {
            const cleanKey = key.trim().toLowerCase();
            for (const target of possibleKeys) {
              if (cleanKey === target.toLowerCase()) {
                return rowObj[key];
              }
            }
          }
          return undefined;
        };

        const importedStudents: StudentMarkEntry[] = json.map((row, idx) => {
          // Detect student name
          const name =
            findVal(row, ['Student Name', 'Candidate Name', 'Name', 'Student', 'Candidate']) ||
            `Student ${idx + 1}`;
          const stdId =
            findVal(row, ['Student ID', 'Candidate ID', 'ID', 'Reg No', 'Registration No', 'Roll No', 'S.No']) ||
            `STU-${String(idx + 1).padStart(3, '0')}`;

          // Detect columns 1, 2, 3 for Part A (20 marks each)
          const col1Raw = findVal(row, [
            '1',
            '1 (20M)',
            '1 (20)',
            'Part A - 1',
            'Part A - Col 1 (/20)',
            'Part A - 1 (Max 20)',
            'Col 1',
            'Column 1',
            'Q1',
          ]);
          const col2Raw = findVal(row, [
            '2',
            '2 (20M)',
            '2 (20)',
            'Part A - 2',
            'Part A - Col 2 (/20)',
            'Part A - 2 (Max 20)',
            'Col 2',
            'Column 2',
            'Q2',
          ]);
          const col3Raw = findVal(row, [
            '3',
            '3 (20M)',
            '3 (20)',
            'Part A - 3',
            'Part A - Col 3 (/20)',
            'Part A - 3 (Max 20)',
            'Col 3',
            'Column 3',
            'Q3',
          ]);

          // Detect Part B: 1 (20M), 2 (20M), Optional (5M)
          const b1Raw = findVal(row, [
            'Part B - 1',
            'Part B - 1 (/20)',
            'Part B - 1 (Max 20)',
            'Part B 1',
            'Part B - Col 1',
            'B1',
            'B - 1',
            'Part B (1)',
          ]);
          const b2Raw = findVal(row, [
            'Part B - 2',
            'Part B - 2 (/20)',
            'Part B - 2 (Max 20)',
            'Part B 2',
            'Part B - Col 2',
            'B2',
            'B - 2',
            'Part B (2)',
          ]);
          const bOptRaw = findVal(row, [
            'Part B - Optional',
            'Part B - Optional (/5)',
            'Part B - Optional (Max 5)',
            'Part B Optional',
            'Optional',
            'Part B - Opt',
            'BOpt',
            'B - Opt',
            'Opt (5M)',
            'Optional (5M)',
          ]);
          const partBRaw = findVal(row, [
            'Part B',
            'Part B (/40)',
            'Part B (Max 40)',
            'Part B (40M)',
            'B',
            'Section B',
          ]);

          const partCRaw = findVal(row, [
            'Part C',
            'Part C - Optional (/20)',
            'Part C - Optional (Max 20)',
            'Part C (Optional)',
            'Part C (20M)',
            'C',
            'Viva',
            'Practical',
          ]);

          const col1 = col1Raw !== undefined && col1Raw !== '' ? col1Raw : '';
          const col2 = col2Raw !== undefined && col2Raw !== '' ? col2Raw : '';
          const col3 = col3Raw !== undefined && col3Raw !== '' ? col3Raw : '';

          let b1 = b1Raw !== undefined && b1Raw !== '' ? b1Raw : '';
          let b2 = b2Raw !== undefined && b2Raw !== '' ? b2Raw : '';
          let bOpt = bOptRaw !== undefined && bOptRaw !== '' ? bOptRaw : '';

          // Fallback if only legacy Part B total was provided
          if (b1 === '' && b2 === '' && partBRaw !== undefined && partBRaw !== '') {
            const totB = Number(partBRaw);
            b1 = Math.min(20, Math.floor(totB / 2));
            b2 = Math.min(20, totB - Number(b1));
          }

          const partC = partCRaw !== undefined && partCRaw !== '' ? partCRaw : '';

          return computeStudentMarkEntry(
            {
              id: `imported-${Date.now()}-${idx}`,
              serialNo: idx + 1,
              studentId: stdId,
              studentName: name,
              partA: {
                col1: col1 !== '' ? Number(col1) : '',
                col2: col2 !== '' ? Number(col2) : '',
                col3: col3 !== '' ? Number(col3) : '',
                total: 0,
              },
              partB: {
                col1: b1 !== '' ? Number(b1) : '',
                col2: b2 !== '' ? Number(b2) : '',
                optional: bOpt !== '' ? Number(bOpt) : '',
                total: 0,
              },
              partC: { marks: partC !== '' ? Number(partC) : '', title: 'Viva / Practical' },
            },
            activeSession
          );
        });

        const updatedSession = {
          ...activeSession,
          students: importedStudents,
          updatedAt: new Date().toISOString(),
        };

        setActiveSession(updatedSession);
        setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
        api.saveMarkSession(updatedSession);
        alert(`Successfully imported ${importedStudents.length} student records from spreadsheet.`);
      } catch (err: any) {
        alert('Failed to parse spreadsheet: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Performance Analytics
  const stats = useMemo(() => {
    if (!activeSession || !activeSession.students.length) {
      return {
        total: 0,
        passCount: 0,
        failCount: 0,
        absentCount: 0,
        passPercentage: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        gradeCounts: { O: 0, 'A+': 0, A: 0, 'B+': 0, B: 0, C: 0, RA: 0 },
      };
    }

    const students = activeSession.students;
    const total = students.length;
    const absentCount = students.filter((s) => s.isAbsent).length;
    const appearedStudents = students.filter((s) => !s.isAbsent);
    const passCount = appearedStudents.filter((s) => s.status === 'PASS').length;
    const failCount = appearedStudents.filter((s) => s.status === 'FAIL').length;
    const passPercentage =
      appearedStudents.length > 0
        ? Math.round((passCount / appearedStudents.length) * 1000) / 10
        : 0;

    const scores = appearedStudents.map((s) => s.grandTotal);
    const averageScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const gradeCounts = { O: 0, 'A+': 0, A: 0, 'B+': 0, B: 0, C: 0, RA: 0 };
    appearedStudents.forEach((s) => {
      const g = s.grade as keyof typeof gradeCounts;
      if (gradeCounts[g] !== undefined) {
        gradeCounts[g]++;
      } else {
        gradeCounts.RA++;
      }
    });

    return {
      total,
      passCount,
      failCount,
      absentCount,
      passPercentage,
      averageScore,
      highestScore,
      lowestScore,
      gradeCounts,
    };
  }, [activeSession]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!activeSession) return [];
    return activeSession.students.filter((s) => {
      const matchesSearch =
        s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === 'ALL'
          ? true
          : filterStatus === 'ABSENT'
          ? s.isAbsent
          : s.status === filterStatus && !s.isAbsent;

      return matchesSearch && matchesStatus;
    });
  }, [activeSession, searchQuery, filterStatus]);

  if (!activeSession) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <GraduationCap className="w-12 h-12 text-indigo-600 animate-bounce mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Loading Mark Evaluation Portal...</h2>
        </div>
      </div>
    );
  }

  const isPartBOptionalEnabled = Boolean(activeSession.partBConfig.isOptionalEnabled);
  const isPartCEnabled = activeSession.partCConfig.isEnabled;
  const partBMaxMarks =
    (activeSession.partBConfig.col1Max || 20) +
    (activeSession.partBConfig.col2Max || 20) +
    (isPartBOptionalEnabled ? activeSession.partBConfig.optionalMax || 5 : 0);
  const maxPossibleMarks =
    activeSession.partAConfig.maxTotal +
    partBMaxMarks +
    (isPartCEnabled ? activeSession.partCConfig.maxMarks : 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      {/* STANDALONE PORTAL TOP BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onBackToMain} title="Return to Main Platform">
            <CompanyLogo size={42} showBorder={true} className="shadow-xs hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  {settings.companyName || 'ITS YOUR TURN'}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  External Mark Portal
                </span>
                {isCompanyAuthorized ? (
                  <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Authorized Issuer</span>
                  </span>
                ) : (
                  <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock className="w-3 h-3 text-amber-600" />
                    <span>Read Only</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Autonomous Academic Evaluation & Tabulation Register
              </p>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center space-x-2.5">
            {saveNotice && (
              <span className="hidden sm:inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                <span>Saved</span>
              </span>
            )}

            <button
              onClick={handleManualSave}
              disabled={isSaving}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors"
              title="Save changes to database"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors"
              title="Print official tabulation register"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Register</span>
            </button>

            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('portal', 'marks');
                url.searchParams.delete('tab');
                window.open(url.toString(), '_blank');
              }}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-colors"
              title="Launch Mark Portal in a separate external browser window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in New Tab</span>
            </button>

            <button
              onClick={onBackToMain}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <span>Back to Main Platform</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* SESSION SELECTION & CONFIGURATION HERO CARD */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            {/* Session Switcher */}
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Active Mark Session
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Batch: {activeSession.batchCode}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={activeSessionId}
                  onChange={(e) => setActiveSessionId(e.target.value)}
                  className="text-base sm:text-lg font-extrabold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500/20 max-w-md truncate"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.subjectName})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleCreateNewSession}
                  className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
                  title="Create new mark evaluation session"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Session</span>
                </button>
              </div>
            </div>

            {/* Session Metadata Badges & Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Subject</span>
                <strong className="text-slate-800">{activeSession.subjectName}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Evaluator</span>
                <strong className="text-slate-800">{activeSession.evaluatorName}</strong>
              </div>

              {/* Part B (Optional 5M) Toggle Switch */}
              <div
                onClick={handleTogglePartBOptional}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center space-x-2 ${
                  isPartBOptionalEnabled
                    ? 'bg-sky-50 border-sky-300 text-sky-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
                title="Part B Optional Column: carries 5 marks if wanted. Click to toggle."
              >
                <div>
                  <div className="flex items-center space-x-1 text-[11px] font-bold">
                    <span>Part B Optional (5M)</span>
                    {isPartBOptionalEnabled ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-600 text-white uppercase">
                        ON (5M)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-200 text-slate-600 uppercase">
                        OFF
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {isPartBOptionalEnabled ? 'Included in 45M Total' : 'Base 40M Total (1 & 2 only)'}
                  </span>
                </div>
                {isPartBOptionalEnabled ? (
                  <ToggleRight className="w-6 h-6 text-sky-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </div>

              {/* Part C (Optional) Toggle Switch */}
              <div
                onClick={handleTogglePartC}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center space-x-2 ${
                  isPartCEnabled
                    ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
                title="Part C is optional. Click to toggle inclusion in this mark session."
              >
                <div>
                  <div className="flex items-center space-x-1 text-[11px] font-bold">
                    <span>Part C (Optional Viva/Project)</span>
                    {isPartCEnabled ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-600 text-white uppercase">
                        ON (20M)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-200 text-slate-600 uppercase">
                        OFF
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {isPartCEnabled ? 'Included in Evaluation' : 'Omitted (Base Total)'}
                  </span>
                </div>
                {isPartCEnabled ? (
                  <ToggleRight className="w-6 h-6 text-purple-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <button
                onClick={() => setShowConfigModal(true)}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center space-x-1"
                title="Configure session titles and criteria"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>

              {sessions.length > 1 && (
                <button
                  onClick={() => handleDeleteSession(activeSession.id)}
                  className="p-2.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                  title="Delete this session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* CRITERIA STRUCTURE BANNER: SPECIFIC PART A & PART B & PART C EXPLANATION */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Part A Rule */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
              <div className="flex items-center justify-between font-bold text-indigo-900">
                <span className="flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Part A (Total: 60 Marks)</span>
                </span>
                <span className="text-[11px] font-mono bg-indigo-200/80 text-indigo-800 px-2 py-0.5 rounded">
                  Max 60
                </span>
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Contains columns <strong>1 (20M)</strong>, <strong>2 (20M)</strong>, and{' '}
                <strong>3 (20M)</strong>. Anyone can fill each column as per requirement.
              </p>
            </div>

            {/* Part B Rule: 1 & 2 (20M each), Optional (5M if wanted) */}
            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-1">
              <div className="flex items-center justify-between font-bold text-sky-900">
                <span className="flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>Part B (1 & 2 @ 20M, Optional @ 5M)</span>
                </span>
                <span className="text-[11px] font-mono bg-sky-200/80 text-sky-800 px-2 py-0.5 rounded">
                  Max {partBMaxMarks}
                </span>
              </div>
              <p className="text-[11px] text-sky-700 leading-relaxed">
                Contains columns <strong>1 (20M)</strong> and <strong>2 (20M)</strong>. Optional column carries{' '}
                <strong>5 Marks</strong> if candidates/evaluators want it.
              </p>
            </div>

            {/* Part C Rule (Optional) */}
            <div
              className={`p-3.5 rounded-2xl border space-y-1 transition-all ${
                isPartCEnabled
                  ? 'bg-purple-50/70 border-purple-200/80 text-purple-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Part C — Strictly Optional</span>
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-200/70 text-purple-800">
                  {isPartCEnabled ? 'Active (20M)' : 'Optional (Inactive)'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {isPartCEnabled
                  ? 'Currently enabled! Adds 20 Marks (Viva / Special Project) to grand total calculation.'
                  : 'Currently inactive. Toggle above to add viva / practical assessment.'}
              </p>
            </div>
          </div>
        </div>

        {/* SUMMARY & PERFORMANCE ANALYTICS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Candidates
              </p>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</h3>
              <p className="text-[11px] text-slate-500">
                {stats.absentCount > 0 ? `${stats.absentCount} Absent` : '100% Present'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pass Rate
              </p>
              <h3 className="text-xl font-black text-emerald-600 mt-0.5">
                {stats.passPercentage}%
              </h3>
              <p className="text-[11px] text-slate-500">
                {stats.passCount} Pass / {stats.failCount} Fail
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Class Average
              </p>
              <h3 className="text-xl font-black text-indigo-700 mt-0.5">
                {stats.averageScore} <span className="text-xs text-slate-400 font-normal">/ {maxPossibleMarks}</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {maxPossibleMarks > 0 ? Math.round((stats.averageScore / maxPossibleMarks) * 100) : 0}% mean score
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Percent className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Highest Mark
              </p>
              <h3 className="text-xl font-black text-sky-700 mt-0.5">
                {stats.highestScore} <span className="text-xs text-slate-400 font-normal">/ {maxPossibleMarks}</span>
              </h3>
              <p className="text-[11px] text-slate-500">Top performer</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between col-span-2 lg:col-span-1">
            <div className="w-full">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Grade Summary
              </p>
              <div className="flex items-center space-x-1.5 mt-1 text-[11px] font-mono">
                <span className="text-emerald-700 font-bold">O:{stats.gradeCounts.O}</span>
                <span className="text-slate-300">|</span>
                <span className="text-sky-700 font-bold">A+:{stats.gradeCounts['A+']}</span>
                <span className="text-slate-300">|</span>
                <span className="text-indigo-700 font-bold">A:{stats.gradeCounts.A}</span>
                <span className="text-slate-300">|</span>
                <span className="text-rose-600 font-bold">RA:{stats.gradeCounts.RA}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SPREADSHEET TOOLBAR: SEARCH, FILTERS, EXCEL IMPORT/EXPORT, ADD STUDENT */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box & Status Filter */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search candidate name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
              {(['ALL', 'PASS', 'FAIL', 'ABSENT'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterStatus === st
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <input
              ref={excelImportInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              className="hidden"
            />

            <button
              onClick={() => excelImportInputRef.current?.click()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
              title="Import mark sheet from Excel or CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import Excel</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
              title="Export complete mark tabulation to Excel"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleDownloadBlankTemplate}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 text-xs transition-colors"
              title="Download blank format template"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Template</span>
            </button>

            <button
              onClick={() => {
                if (activeSession.students.length > 0) {
                  setSelectedCertStudentId(activeSession.students[0].id);
                  setShowCertModal(true);
                }
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
              title="Generate and preview certificates with dynamic QR code containing student marks"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Issue Certificates with Marks QR</span>
            </button>

            <button
              onClick={() => setShowAddStudentModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Candidate</span>
            </button>
          </div>
        </div>

        {/* SPREADSHEET MATRIX TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Grouped Header */}
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-200 w-12">
                    #
                  </th>
                  <th rowSpan={2} className="py-3 px-3 border-r border-slate-200 w-28">
                    Candidate ID
                  </th>
                  <th rowSpan={2} className="py-3 px-4 border-r border-slate-200 min-w-[160px]">
                    Candidate Name
                  </th>

                  {/* PART A HEADER: 60 MARKS TOTAL (1, 2, 3 COLUMNS) */}
                  <th
                    colSpan={4}
                    className="py-2 px-3 text-center bg-indigo-50/90 text-indigo-900 border-r border-indigo-200 font-black"
                  >
                    PART A (60 MARKS TOTAL)
                  </th>

                  {/* PART B HEADER: 1 & 2 (20M each), Optional (5M if wanted) */}
                  <th
                    colSpan={isPartBOptionalEnabled ? 4 : 3}
                    className="py-2 px-3 text-center bg-sky-50/90 text-sky-900 border-r border-sky-200 font-black"
                  >
                    PART B ({isPartBOptionalEnabled ? '45 MARKS (OPTIONAL ON)' : '40 MARKS'})
                  </th>

                  {/* PART C HEADER: OPTIONAL */}
                  {isPartCEnabled && (
                    <th
                      className="py-2 px-3 text-center bg-purple-50/90 text-purple-900 border-r border-purple-200 font-black"
                    >
                      PART C (OPTIONAL 20M)
                    </th>
                  )}

                  <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-200 w-20">
                    Grand Total
                  </th>
                  <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-200 w-16">
                    %
                  </th>
                  <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-200 w-16">
                    Grade
                  </th>
                  <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-200 w-20">
                    Status
                  </th>
                  <th rowSpan={2} className="py-3 px-3 text-right w-24">
                    Actions
                  </th>
                </tr>

                {/* Sub-Header Columns for Part A, Part B, Part C */}
                <tr className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200">
                  {/* Column 1 */}
                  <th className="py-1.5 px-2.5 text-center bg-indigo-50/40 border-r border-slate-200 w-20">
                    1 (20M)
                  </th>
                  {/* Column 2 */}
                  <th className="py-1.5 px-2.5 text-center bg-indigo-50/40 border-r border-slate-200 w-20">
                    2 (20M)
                  </th>
                  {/* Column 3 */}
                  <th className="py-1.5 px-2.5 text-center bg-indigo-50/40 border-r border-slate-200 w-20">
                    3 (20M)
                  </th>
                  {/* Part A Total */}
                  <th className="py-1.5 px-2.5 text-center bg-indigo-100/60 text-indigo-900 border-r border-indigo-200 font-black w-20">
                    Total (/60)
                  </th>

                  {/* Part B Columns */}
                  <th className="py-1.5 px-2 text-center bg-sky-50/40 border-r border-slate-200 w-20">
                    1 (20M)
                  </th>
                  <th className="py-1.5 px-2 text-center bg-sky-50/40 border-r border-slate-200 w-20">
                    2 (20M)
                  </th>
                  {isPartBOptionalEnabled && (
                    <th className="py-1.5 px-2 text-center bg-purple-50/40 border-r border-purple-200 w-20 text-purple-900 font-bold">
                      Opt (5M)
                    </th>
                  )}
                  <th className="py-1.5 px-2 text-center bg-sky-100/60 text-sky-900 border-r border-sky-200 font-black w-20">
                    Total
                  </th>

                  {/* Part C Score if enabled */}
                  {isPartCEnabled && (
                    <th className="py-1.5 px-2.5 text-center bg-purple-50/40 text-purple-900 border-r border-purple-200 font-black w-24">
                      Score (/20)
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStudents.map((student, idx) => {
                  const isAbsent = student.isAbsent;
                  const isPass = student.status === 'PASS';

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isAbsent ? 'bg-amber-50/30' : !isPass ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* S.No */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 border-r border-slate-100">
                        {student.serialNo || idx + 1}
                      </td>

                      {/* Student ID */}
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 border-r border-slate-100">
                        {student.studentId}
                      </td>

                      {/* Student Name */}
                      <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-100">
                        <div className="flex items-center space-x-1.5">
                          <span>{student.studentName}</span>
                          {isAbsent && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1 rounded">
                              AB
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PART A: COLUMN 1 (MAX 20) */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-100">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={isAbsent}
                          value={student.partA.col1 ?? ''}
                          onChange={(e) =>
                            handleMarkChange(student.id, 'partA_col1', e.target.value)
                          }
                          placeholder="0-20"
                          className="w-16 text-center py-1 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>

                      {/* PART A: COLUMN 2 (MAX 20) */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-100">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={isAbsent}
                          value={student.partA.col2 ?? ''}
                          onChange={(e) =>
                            handleMarkChange(student.id, 'partA_col2', e.target.value)
                          }
                          placeholder="0-20"
                          className="w-16 text-center py-1 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>

                      {/* PART A: COLUMN 3 (MAX 20) */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-100">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={isAbsent}
                          value={student.partA.col3 ?? ''}
                          onChange={(e) =>
                            handleMarkChange(student.id, 'partA_col3', e.target.value)
                          }
                          placeholder="0-20"
                          className="w-16 text-center py-1 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>

                      {/* PART A TOTAL (/60) */}
                      <td className="py-2.5 px-2 text-center font-mono font-black text-indigo-700 bg-indigo-50/40 border-r border-indigo-100">
                        {isAbsent ? '-' : student.partA.total}
                      </td>

                      {/* PART B: COLUMN 1 (MAX 20) */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-100">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={isAbsent}
                          value={student.partB.col1 ?? ''}
                          onChange={(e) =>
                            handleMarkChange(student.id, 'partB_col1', e.target.value)
                          }
                          placeholder="0-20"
                          className="w-16 text-center py-1 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>

                      {/* PART B: COLUMN 2 (MAX 20) */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-100">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={isAbsent}
                          value={student.partB.col2 ?? ''}
                          onChange={(e) =>
                            handleMarkChange(student.id, 'partB_col2', e.target.value)
                          }
                          placeholder="0-20"
                          className="w-16 text-center py-1 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>

                      {/* PART B: OPTIONAL (MAX 5 IF WANTED) */}
                      {isPartBOptionalEnabled && (
                        <td className="py-1.5 px-2 text-center border-r border-purple-100">
                          <input
                            type="number"
                            min="0"
                            max="5"
                            disabled={isAbsent}
                            value={student.partB.optional ?? ''}
                            onChange={(e) =>
                              handleMarkChange(student.id, 'partB_optional', e.target.value)
                            }
                            placeholder="0-5"
                            className="w-14 text-center py-1 rounded-lg border border-purple-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono text-xs font-bold bg-purple-50/20 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </td>
                      )}

                      {/* PART B TOTAL */}
                      <td className="py-2.5 px-2 text-center font-mono font-black text-sky-800 bg-sky-50/40 border-r border-sky-100">
                        {isAbsent ? '-' : student.partB.total}
                      </td>

                      {/* PART C (OPTIONAL /20) */}
                      {isPartCEnabled && (
                        <td className="py-1.5 px-2 text-center border-r border-purple-100">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            disabled={isAbsent}
                            value={student.partC?.marks ?? ''}
                            onChange={(e) =>
                              handleMarkChange(student.id, 'partC', e.target.value)
                            }
                            placeholder="0-20"
                            className="w-16 text-center py-1 rounded-lg border border-purple-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </td>
                      )}

                      {/* GRAND TOTAL */}
                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 border-r border-slate-100">
                        {isAbsent ? '-' : student.grandTotal}
                      </td>

                      {/* PERCENTAGE */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 border-r border-slate-100">
                        {isAbsent ? '-' : `${student.percentage}%`}
                      </td>

                      {/* GRADE */}
                      <td className="py-2.5 px-3 text-center font-mono font-black border-r border-slate-100">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                            student.grade === 'O' || student.grade === 'A+'
                              ? 'bg-emerald-100 text-emerald-800'
                              : student.grade === 'A' || student.grade === 'B+'
                              ? 'bg-sky-100 text-sky-800'
                              : student.grade === 'B' || student.grade === 'C'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {student.grade}
                        </span>
                      </td>

                      {/* RESULT STATUS */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-100">
                        {isAbsent ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            ABSENT
                          </span>
                        ) : isPass ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            PASS
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            FAIL
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCertStudentId(student.id);
                            setShowCertModal(true);
                          }}
                          className="p-1.5 rounded-lg text-purple-600 hover:text-purple-900 hover:bg-purple-50 transition-colors"
                          title="Generate Certificate with Mark QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleAbsent(student.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isAbsent
                              ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                              : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                          }`}
                          title={isAbsent ? 'Mark as Present' : 'Mark as Absent'}
                        >
                          {isAbsent ? <UserCheck className="w-3.5 h-3.5" /> : <UserMinus className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveStudent(student.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove student row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        3 + // #, id, name
                        4 + // Part A
                        (isPartBOptionalEnabled ? 4 : 3) + // Part B
                        (isPartCEnabled ? 1 : 0) + // Part C
                        5 // total, %, grade, status, actions
                      }
                      className="py-12 text-center text-slate-400 text-xs"
                    >
                      No student records found in this mark session. Click "Add Candidate" or "Import Excel" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PRINTABLE TABULATION REGISTER (VISIBLE IN PRINT & EMBEDDED PREVIEW) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm print:block">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Official Statement of Marks & Tabulation Sheet
              </h3>
              <p className="text-xs text-slate-500">
                Official institutional evaluation record formatted for academic committee signature and archiving.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Statement</span>
            </button>
          </div>

          {/* Institutional Header in Statement */}
          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 text-center space-y-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
              {settings.companyName || 'ITS YOUR TURN'}
            </h2>
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              {activeSession.name}
            </p>
            <p className="text-xs text-slate-500">
              Subject: <strong>{activeSession.subjectName}</strong> • Batch Code:{' '}
              <span className="font-mono">{activeSession.batchCode}</span> • Examination Date:{' '}
              {activeSession.sessionDate}
            </p>
            <div className="pt-2 text-[11px] text-slate-600 flex justify-center gap-6">
              <span>Part A: 60 Marks (Cols 1, 2, 3 @ 20M each)</span>
              <span>Part B: 40 Marks</span>
              <span>Part C: {isPartCEnabled ? '20 Marks (Active)' : 'Optional (Omitted)'}</span>
              <span>Max Marks: {maxPossibleMarks}</span>
            </div>
          </div>

          {/* Signatures Footer */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
            <div className="space-y-8">
              <div className="border-b border-slate-400 w-40 mx-auto" />
              <p className="font-bold text-slate-800">Faculty / Evaluator</p>
              <p className="text-[10px] text-slate-400 -mt-7">{activeSession.evaluatorName}</p>
            </div>

            <div className="space-y-8">
              <div className="border-b border-slate-400 w-40 mx-auto" />
              <p className="font-bold text-slate-800">Head of Examination</p>
              <p className="text-[10px] text-slate-400 -mt-7">Academic Committee</p>
            </div>

            <div className="space-y-8">
              <div className="border-b border-slate-400 w-40 mx-auto" />
              <p className="font-bold text-slate-800">Authorized Signatory</p>
              <p className="text-[10px] text-slate-400 -mt-7">{settings.companyName || 'ITS YOUR TURN'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* SESSION CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Edit Mark Session Parameters</h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Session Title *
                </label>
                <input
                  type="text"
                  value={activeSession.name}
                  onChange={(e) =>
                    setActiveSession({ ...activeSession, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Subject / Course *
                  </label>
                  <input
                    type="text"
                    value={activeSession.subjectName}
                    onChange={(e) =>
                      setActiveSession({ ...activeSession, subjectName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Batch Code
                  </label>
                  <input
                    type="text"
                    value={activeSession.batchCode}
                    onChange={(e) =>
                      setActiveSession({ ...activeSession, batchCode: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-semibold focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Evaluator / Faculty Name
                  </label>
                  <input
                    type="text"
                    value={activeSession.evaluatorName}
                    onChange={(e) =>
                      setActiveSession({ ...activeSession, evaluatorName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Examination Date
                  </label>
                  <input
                    type="date"
                    value={activeSession.sessionDate}
                    onChange={(e) =>
                      setActiveSession({ ...activeSession, sessionDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Part C Optional Toggle */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-purple-900">Include Part C (Optional Viva / Practical)</p>
                  <p className="text-[11px] text-purple-700">
                    If active, students have an optional 20-mark score added to their grand total.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={activeSession.partCConfig.isEnabled}
                  onChange={handleTogglePartC}
                  className="w-5 h-5 text-purple-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  api.saveMarkSession(activeSession);
                  setShowConfigModal(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                Save Parameters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CANDIDATE MODAL */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add New Candidate</h3>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Candidate Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arun Kumar"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Registration / Candidate ID
                </label>
                <input
                  type="text"
                  placeholder={`e.g. IYT-2026-${String(activeSession.students.length + 1).padStart(3, '0')}`}
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-semibold focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddStudent}
                disabled={!newStudentName.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50"
              >
                Add Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICATES GENERATION WITH MARKS QR CODE MODAL */}
      {showCertModal && activeSession && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-6xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
            {/* Modal Header */}
            <div className="p-5 sm:px-7 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                    <QrCode className="w-5 h-5 text-purple-300" />
                  </span>
                  <h3 className="font-extrabold text-base sm:text-lg text-white">
                    Certificate Issuance with Embedded Marks QR Code
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase">
                    Verified QR Security
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-3xl">
                  Each certificate is dynamically rendered with a scannable QR code carrying the student's exact
                  academic scorecard (Part A 60M, Part B 40/45M, Part C, grand total, and grade).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCertModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                title="Close Certificate Modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body: Left Canvas & Controls, Right Student Marks Details & Batch Action */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Notice Toast */}
              {registeredNotice && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{registeredNotice}</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowCertModal(false);
                      onBackToMain();
                    }}
                    className="underline text-emerald-900 hover:text-emerald-700 font-extrabold"
                  >
                    View in Batches Manager →
                  </button>
                </div>
              )}

              {/* Signature Notice Toast */}
              {sigNotice && (
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span>{sigNotice}</span>
                </div>
              )}

              {/* Top Controls: Candidate Selector, Template Selector & Authorized E-Signature */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {/* 1. Candidate Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Candidate to Preview
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedCertStudentId || (activeSession.students[0]?.id ?? '')}
                      onChange={(e) => setSelectedCertStudentId(e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500/20"
                    >
                      {activeSession.students.map((stu, i) => (
                        <option key={stu.id} value={stu.id}>
                          #{i + 1} {stu.studentName} ({stu.studentId}) — {stu.grandTotal}/{stu.maxMarks} ({stu.percentage}%) [{stu.grade}]
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Template Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Certificate Design Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500/20"
                  >
                    {templates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Authorized E-Signature Quick Action */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>Issuer Signature</span>
                    </label>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                      {settings.signatureUrl ? 'Issuer Active' : 'Default'}
                    </span>
                  </div>

                  {/* Hidden file input for e-signature */}
                  <input
                    ref={sigFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="inline-flex items-center justify-center space-x-1 py-2 px-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition-colors shadow-2xs"
                      title="Paste signature from clipboard (Ctrl+V / Cmd+V)"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Paste</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => sigFileInputRef.current?.click()}
                      className="inline-flex items-center justify-center space-x-1 py-2 px-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-colors shadow-2xs"
                      title="Upload an e-signature file (PNG, JPG, SVG)"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-purple-200" />
                      <span>Upload</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsSigDrawModalOpen(true)}
                      className="inline-flex items-center justify-center space-x-1 py-2 px-1.5 rounded-xl bg-white hover:bg-slate-100 text-purple-800 font-bold text-[11px] border border-purple-200 transition-colors shadow-2xs"
                      title="Draw signature interactively on canvas"
                    >
                      <PenTool className="w-3.5 h-3.5 text-purple-600" />
                      <span>Draw</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content: Canvas Preview and Score Breakdown */}
              {activeSession.students.length > 0 ? (
                (() => {
                  const currentStudent =
                    activeSession.students.find((s) => s.id === selectedCertStudentId) ||
                    activeSession.students[0];

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left: Canvas Preview Box (8 cols) */}
                      <div className="lg:col-span-8 space-y-4">
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md flex items-center justify-center p-2 min-h-[360px]">
                          {isPreviewRendering && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-10 text-white space-x-2 text-xs font-bold">
                              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                              <span>Rendering Certificate & Marks QR...</span>
                            </div>
                          )}
                          <canvas
                            ref={certCanvasRef}
                            className="max-w-full h-auto rounded-xl shadow-lg border border-slate-700/50"
                            style={{ maxHeight: '420px', width: 'auto' }}
                          />
                        </div>

                        {/* Actions below Preview Canvas */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleTestScanQr(currentStudent)}
                            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all shadow-2xs"
                            title="Simulate scanning the QR code: opens the public verification portal with decoded marks"
                          >
                            <ExternalLink className="w-4 h-4 text-purple-600" />
                            <span>Test Scan QR / Open Verification Portal</span>
                          </button>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={handleDownloadSinglePng}
                              className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
                              title="Download high-resolution certificate image (PNG)"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-600" />
                              <span>PNG</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleDownloadSinglePdf}
                              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs"
                              title="Download certificate as PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Candidate Mark Breakdown & Batch Generation (4 cols) */}
                      <div className="lg:col-span-4 space-y-4">
                        {/* Selected Candidate Score Card */}
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3.5 text-xs">
                          <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Candidate Details
                              </span>
                              <h4 className="font-extrabold text-slate-900 text-sm">
                                {currentStudent.studentName}
                              </h4>
                              <p className="text-[11px] font-mono text-slate-500">
                                {currentStudent.studentId}
                              </p>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                                currentStudent.status === 'PASS'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {currentStudent.status} • {currentStudent.grade}
                            </span>
                          </div>

                          {/* Score Matrix inside QR Code */}
                          <div className="space-y-2 text-[11px]">
                            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                              Scores Encoded in QR Code:
                            </p>

                            {/* Part A breakdown */}
                            <div className="p-2.5 rounded-xl bg-white border border-indigo-100 space-y-1">
                              <div className="flex justify-between font-bold text-indigo-950">
                                <span>Part A (60M Total):</span>
                                <span className="font-mono">{currentStudent.partA.total} / 60</span>
                              </div>
                              <div className="grid grid-cols-3 text-center text-[10px] text-slate-600 pt-0.5">
                                <div>1: <strong>{currentStudent.partA.col1 ?? '-'}</strong>/20</div>
                                <div>2: <strong>{currentStudent.partA.col2 ?? '-'}</strong>/20</div>
                                <div>3: <strong>{currentStudent.partA.col3 ?? '-'}</strong>/20</div>
                              </div>
                            </div>

                            {/* Part B breakdown */}
                            <div className="p-2.5 rounded-xl bg-white border border-sky-100 space-y-1">
                              <div className="flex justify-between font-bold text-sky-950">
                                <span>
                                  Part B (
                                  {isPartBOptionalEnabled ? '45M: 1, 2 & Opt' : '40M: 1 & 2'}):
                                </span>
                                <span className="font-mono">
                                  {currentStudent.partB.total} /{' '}
                                  {isPartBOptionalEnabled ? '45' : '40'}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 text-center text-[10px] text-slate-600 pt-0.5">
                                <div>1: <strong>{currentStudent.partB.col1 ?? '-'}</strong>/20</div>
                                <div>2: <strong>{currentStudent.partB.col2 ?? '-'}</strong>/20</div>
                                <div>
                                  Opt:{' '}
                                  <strong>
                                    {isPartBOptionalEnabled
                                      ? currentStudent.partB.optional ?? '-'
                                      : 'Off'}
                                  </strong>
                                  /5
                                </div>
                              </div>
                            </div>

                            {/* Part C (if active) */}
                            {isPartCEnabled && (
                              <div className="p-2.5 rounded-xl bg-white border border-purple-100 flex justify-between font-bold text-purple-950">
                                <span>Part C (Optional):</span>
                                <span className="font-mono">{currentStudent.partC?.marks ?? 0} / 20</span>
                              </div>
                            )}

                            {/* Totals Summary */}
                            <div className="p-2.5 rounded-xl bg-slate-900 text-white flex justify-between items-center font-mono">
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase">
                                  Grand Total
                                </span>
                                <strong className="text-sm">
                                  {currentStudent.grandTotal} / {currentStudent.maxMarks}
                                </strong>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-slate-400 block uppercase">
                                  Percentage
                                </span>
                                <strong className="text-sm text-emerald-400">
                                  {currentStudent.percentage}%
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Authorized E-Signature Management Card */}
                        <div className="bg-white rounded-2xl border border-purple-200 p-4 space-y-3.5 shadow-2xs">
                          {/* Card Header with Issuer Authority Badge */}
                          <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                            <div className="flex items-center space-x-2">
                              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                                <Lock className="w-3.5 h-3.5 text-amber-700" />
                              </span>
                              <div>
                                <h4 className="font-extrabold text-slate-900 text-xs">
                                  Authorized Issuer E-Signature
                                </h4>
                              </div>
                            </div>
                            {settings.signatureUrl ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Issuer Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                Default Template
                              </span>
                            )}
                          </div>

                          {/* Restricted Issuer Authority Disclaimer */}
                          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-2.5 flex items-start space-x-2 text-[11px] text-amber-900 leading-snug">
                            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold text-amber-950">
                                Restricted Authority: Only You Can Paste Signature
                              </strong>
                              <span>
                                Only you (the certificate issuer) have authority to paste or apply this official signature. It is sealed into all certificates alongside the verified QR code. No subtitles will be shown below the signature.
                              </span>
                            </div>
                          </div>

                          {/* Interactive Transparency Checkerboard Drop & Paste Zone */}
                          <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleSigDrop}
                            className="w-full h-24 rounded-xl border-2 border-dashed border-purple-200 bg-white p-2 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group transition-all hover:border-purple-400"
                            style={{
                              backgroundImage:
                                'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                              backgroundSize: '12px 12px',
                              backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                            }}
                            title="Drop signature image here or press Ctrl+V to paste"
                          >
                            <img
                              src={settings.signatureUrl || createDefaultSignatureSvg()}
                              alt="Authorized Signature"
                              className="max-h-[75px] max-w-full object-contain filter drop-shadow-xs"
                            />
                            <div className="absolute bottom-1 right-2 text-[9px] font-semibold text-slate-400 pointer-events-none">
                              Press Ctrl+V to paste anytime
                            </div>
                          </div>

                          {/* Rectified Methods: Paste (Primary), Upload, Draw */}
                          <div className="space-y-1.5 pt-1">
                            <button
                              type="button"
                              onClick={handlePasteFromClipboard}
                              className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-sm transition-all active:scale-[0.99]"
                              title="Paste signature image copied to your clipboard (Ctrl+V / Cmd+V)"
                            >
                              <Clipboard className="w-4 h-4" />
                              <span>Paste Signature from Clipboard (Ctrl+V)</span>
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => sigFileInputRef.current?.click()}
                                className="inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 transition-colors shadow-2xs"
                                title="Browse computer for transparent PNG or SVG signature"
                              >
                                <UploadCloud className="w-3.5 h-3.5 text-purple-600" />
                                <span>Upload File</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setIsSigDrawModalOpen(true)}
                                className="inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs border border-indigo-200 transition-colors shadow-2xs"
                                title="Draw signature on digital signature pad"
                              >
                                <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Draw Signature</span>
                              </button>
                            </div>
                          </div>

                          {/* Footer with Reset option */}
                          {settings.signatureUrl && (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center space-x-1">
                                <Check className="w-3 h-3" />
                                <span>Clean Signature Active (No Subtitles)</span>
                              </span>
                              <button
                                type="button"
                                onClick={handleResetSignature}
                                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Reset Default</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Batch Operations Card */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-4 space-y-3">
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-slate-900 text-xs">
                              Bulk Issuance & ZIP Packaging
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              Generate individual certificates with unique marks QR codes for all{' '}
                              <strong>{activeSession.students.length} candidates</strong> in this session.
                            </p>
                          </div>

                          {/* Bulk Progress Bar if Generating */}
                          {isGeneratingBulkCertificates && (
                            <div className="space-y-1.5 p-3 rounded-xl bg-white border border-indigo-200">
                              <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                                <span>Packaging Certificates ZIP...</span>
                                <span className="font-mono">
                                  {bulkProgress.completed} / {bulkProgress.total}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-2 transition-all duration-200 rounded-full"
                                  style={{
                                    width: `${
                                      bulkProgress.total > 0
                                        ? (bulkProgress.completed / bulkProgress.total) * 100
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                              {bulkProgress.currentStudent && (
                                <p className="text-[10px] text-slate-400 truncate">
                                  Rendering: {bulkProgress.currentStudent}
                                </p>
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleBulkDownloadZip}
                            disabled={isGeneratingBulkCertificates || activeSession.students.length === 0}
                            className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition-all disabled:opacity-50"
                          >
                            {isGeneratingBulkCertificates ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Building ZIP Archive...</span>
                              </>
                            ) : (
                              <>
                                <FileArchive className="w-4 h-4" />
                                <span>Download All as ZIP</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleRegisterBatchToPlatform}
                            className="w-full inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 transition-colors shadow-2xs"
                            title="Register this mark session as a permanent batch with verified QR credentials"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Register Batch to Main Platform</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <p className="font-bold text-slate-600">No candidates found in this mark session.</p>
                  <p className="text-xs">
                    Please add candidates or import an Excel spreadsheet before issuing certificates.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Batch Code: <strong className="font-mono text-slate-800">{activeSession.batchCode}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowCertModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Signature Drawing Pad Modal */}
      {isSigDrawModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <PenTool className="w-5 h-5 text-purple-600" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Draw E-Signature</h3>
                  <p className="text-xs text-slate-500">Use mouse, touchpad, or touchscreen stylus to sign</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSigDrawModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative border-2 border-dashed border-purple-300 rounded-2xl bg-white overflow-hidden shadow-inner flex flex-col items-center justify-center">
              <canvas
                ref={sigCanvasDrawRef}
                width={560}
                height={220}
                onMouseDown={startSigDraw}
                onMouseMove={drawSig}
                onMouseUp={stopSigDraw}
                onMouseLeave={stopSigDraw}
                onTouchStart={startSigDraw}
                onTouchMove={drawSig}
                onTouchEnd={stopSigDraw}
                className="cursor-crosshair w-full h-[220px] bg-white touch-none"
              />
              <div className="absolute bottom-2 left-4 pointer-events-none text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                Sign inside boundary • Transparent PNG rendered
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={clearSigPad}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-colors"
              >
                <Eraser className="w-4 h-4 text-slate-500" />
                <span>Clear Canvas</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSigDrawModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveDrawnSignature}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/25 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Apply Signature</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
