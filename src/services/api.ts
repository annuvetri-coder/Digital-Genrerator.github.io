import {
  CertificateBatch,
  CertificateRecord,
  CertificateTemplate,
  CompanySettings,
  MarkSession,
  StudentRecord,
  VerificationResult,
} from '../types';
import { PRESET_TEMPLATES } from '../utils/defaultTemplates';
import { getSampleStudentsData } from '../utils/excelParser';
import { createDefaultMarkSession } from '../utils/markSessionHelper';

const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'cert_gen_auth_token',
  AUTH_USER: 'cert_gen_auth_user',
  SETTINGS: 'cert_gen_settings',
  TEMPLATES: 'cert_gen_templates',
  BATCHES: 'cert_gen_batches',
  CERTIFICATES: 'cert_gen_certificates',
  MARK_SESSIONS: 'cert_gen_mark_sessions',
};

export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'ITS YOUR TURN',
  companyEmail: 'annuvetri@gmail.com',
  website: 'itsyourturn.co.in',
  logoUrl: '/logo.svg',
  signatureUrl: '',
  certificatePrefix: 'IYT-2026-',
  defaultStartNumber: 1,
  numberPadding: 4,
  verificationBaseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  defaultFont: 'Playfair Display',
  defaultPrimaryColor: '#0F172A',
  signerName: 'Authorized Signatory',
  signerTitle: 'Academic Director',
  organizationName: 'ITS YOUR TURN',
};

// Initial sample seed if storage empty
function initializeLocalStorageSeed() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }

  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.TEMPLATES)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TEMPLATES, JSON.stringify(PRESET_TEMPLATES));
  }

  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.BATCHES)) {
    const sampleStudents = getSampleStudentsData();
    const initialBatch: CertificateBatch = {
      id: 'batch-sample-1',
      batchId: 'IYT-IOT-2026-10',
      name: 'IoT Training – October 2026',
      courseName: 'IoT Training',
      studentCount: sampleStudents.length,
      templateId: PRESET_TEMPLATES[0].id,
      templateName: PRESET_TEMPLATES[0].name,
      issueDate: '05 October 2026',
      createdAt: '2026-10-01T10:00:00.000Z',
      students: sampleStudents,
    };
    localStorage.setItem(LOCAL_STORAGE_KEYS.BATCHES, JSON.stringify([initialBatch]));

    const initialCertificates: CertificateRecord[] = sampleStudents.map((s) => ({
      id: `cert-${s.certificateNumber}`,
      certificateNumber: s.certificateNumber,
      studentName: s.studentName,
      courseName: s.courseName,
      issueDate: s.issueDate,
      batchId: initialBatch.batchId,
      batchName: initialBatch.name,
      templateId: initialBatch.templateId,
      verificationId: s.verificationId,
      marks: s.marks,
      status: 'valid',
      createdAt: '2026-10-01T10:05:00.000Z',
    }));
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.CERTIFICATES,
      JSON.stringify(initialCertificates)
    );
  }

  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.MARK_SESSIONS)) {
    const defaultSession = createDefaultMarkSession();
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.MARK_SESSIONS,
      JSON.stringify([defaultSession])
    );
  }
}

initializeLocalStorageSeed();

class StorageService {
  private isOnlineBackendAvailable = true;

  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // --- SETTINGS ---
  async getSettings(): Promise<CompanySettings> {
    try {
      const res = await fetch('/api/settings', {
        headers: this.getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(data));
        return data;
      }
    } catch {
      this.isOnlineBackendAvailable = false;
    }
    const local = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
    return local ? JSON.parse(local) : DEFAULT_SETTINGS;
  }

  async saveSettings(settings: CompanySettings): Promise<CompanySettings> {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(settings),
      });
    } catch {
      // offline fallback succeeded
    }
    return settings;
  }

  // --- TEMPLATES ---
  async getTemplates(): Promise<CertificateTemplate[]> {
    try {
      const res = await fetch('/api/templates', {
        headers: this.getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(LOCAL_STORAGE_KEYS.TEMPLATES, JSON.stringify(data));
        return data;
      }
    } catch {
      this.isOnlineBackendAvailable = false;
    }
    const local = localStorage.getItem(LOCAL_STORAGE_KEYS.TEMPLATES);
    return local ? JSON.parse(local) : PRESET_TEMPLATES;
  }

  async saveTemplate(template: CertificateTemplate): Promise<CertificateTemplate> {
    const templates = await this.getTemplates();
    const index = templates.findIndex((t) => t.id === template.id);
    let updated: CertificateTemplate[];
    if (index >= 0) {
      updated = [...templates];
      updated[index] = template;
    } else {
      updated = [template, ...templates];
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));

    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(template),
      });
    } catch {
      // offline fallback
    }
    return template;
  }

  async deleteTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates();
    const filtered = templates.filter((t) => t.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.TEMPLATES, JSON.stringify(filtered));

    try {
      await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });
    } catch {
      // offline fallback
    }
  }

  // --- BATCHES ---
  async getBatches(): Promise<CertificateBatch[]> {
    try {
      const res = await fetch('/api/batches', {
        headers: this.getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(LOCAL_STORAGE_KEYS.BATCHES, JSON.stringify(data));
        return data;
      }
    } catch {
      this.isOnlineBackendAvailable = false;
    }
    const local = localStorage.getItem(LOCAL_STORAGE_KEYS.BATCHES);
    return local ? JSON.parse(local) : [];
  }

  async saveBatch(batch: CertificateBatch): Promise<CertificateBatch> {
    const batches = await this.getBatches();
    const updated = [batch, ...batches.filter((b) => b.id !== batch.id)];
    localStorage.setItem(LOCAL_STORAGE_KEYS.BATCHES, JSON.stringify(updated));

    try {
      await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(batch),
      });
    } catch {
      // offline
    }
    return batch;
  }

  async deleteBatch(batchId: string): Promise<void> {
    const batches = await this.getBatches();
    const filtered = batches.filter((b) => b.id !== batchId && b.batchId !== batchId);
    localStorage.setItem(LOCAL_STORAGE_KEYS.BATCHES, JSON.stringify(filtered));

    try {
      await fetch(`/api/batches/${batchId}`, {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });
    } catch {
      // offline
    }
  }

  // --- CERTIFICATES ---
  async getCertificates(): Promise<CertificateRecord[]> {
    try {
      const res = await fetch('/api/certificates', {
        headers: this.getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(LOCAL_STORAGE_KEYS.CERTIFICATES, JSON.stringify(data));
        return data;
      }
    } catch {
      this.isOnlineBackendAvailable = false;
    }
    const local = localStorage.getItem(LOCAL_STORAGE_KEYS.CERTIFICATES);
    return local ? JSON.parse(local) : [];
  }

  async saveCertificatesBulk(newRecords: CertificateRecord[]): Promise<void> {
    const existing = await this.getCertificates();
    const existingMap = new Map(existing.map((c) => [c.certificateNumber, c]));

    newRecords.forEach((rec) => {
      existingMap.set(rec.certificateNumber, rec);
    });

    const combined = Array.from(existingMap.values());
    localStorage.setItem(LOCAL_STORAGE_KEYS.CERTIFICATES, JSON.stringify(combined));

    try {
      await fetch('/api/certificates/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(newRecords),
      });
    } catch {
      // offline fallback
    }
  }

  async updateCertificateStatus(
    certNumber: string,
    status: 'valid' | 'revoked' | 'reissued',
    reason?: string
  ): Promise<CertificateRecord | null> {
    const certs = await this.getCertificates();
    const target = certs.find(
      (c) => c.certificateNumber.toLowerCase() === certNumber.toLowerCase()
    );

    if (target) {
      target.status = status;
      if (status === 'revoked') {
        target.revokedReason = reason || 'Revoked by administrator';
        target.revokedAt = new Date().toISOString();
      } else {
        target.revokedReason = undefined;
        target.revokedAt = undefined;
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.CERTIFICATES, JSON.stringify(certs));
    }

    try {
      await fetch(`/api/certificates/${encodeURIComponent(certNumber)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify({ status, reason }),
      });
    } catch {
      // offline fallback
    }

    return target || null;
  }

  async deleteCertificate(certNumberOrId: string): Promise<boolean> {
    const certs = await this.getCertificates();
    const clean = certNumberOrId.trim().toLowerCase();
    const filtered = certs.filter(
      (c) => c.certificateNumber.toLowerCase() !== clean && c.id.toLowerCase() !== clean
    );
    localStorage.setItem(LOCAL_STORAGE_KEYS.CERTIFICATES, JSON.stringify(filtered));

    try {
      await fetch(`/api/certificates/${encodeURIComponent(certNumberOrId)}`, {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });
    } catch {
      // offline fallback
    }
    return true;
  }

  async deleteCertificatesBulk(certNumbers: string[]): Promise<number> {
    const certs = await this.getCertificates();
    const set = new Set(certNumbers.map((num) => num.trim().toLowerCase()));
    const filtered = certs.filter(
      (c) => !set.has(c.certificateNumber.toLowerCase()) && !set.has(c.id.toLowerCase())
    );
    localStorage.setItem(LOCAL_STORAGE_KEYS.CERTIFICATES, JSON.stringify(filtered));

    try {
      await fetch('/api/certificates/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify({ certificateNumbers: certNumbers }),
      });
    } catch {
      // offline fallback
    }
    return certs.length - filtered.length;
  }

  async clearAllCertificates(): Promise<void> {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CERTIFICATES, JSON.stringify([]));
    try {
      await fetch('/api/certificates/clear', {
        method: 'POST',
        headers: this.getAuthHeader(),
      });
    } catch {
      // offline fallback
    }
  }

  async clearAllBatches(): Promise<void> {
    localStorage.setItem(LOCAL_STORAGE_KEYS.BATCHES, JSON.stringify([]));
    try {
      await fetch('/api/batches/clear', {
        method: 'POST',
        headers: this.getAuthHeader(),
      });
    } catch {
      // offline fallback
    }
  }

  async clearAllMarkSessions(): Promise<void> {
    localStorage.setItem(LOCAL_STORAGE_KEYS.MARK_SESSIONS, JSON.stringify([]));
    try {
      await fetch('/api/marks/clear', {
        method: 'POST',
        headers: this.getAuthHeader(),
      });
    } catch {
      // offline fallback
    }
  }

  async clearAllData(options?: { keepSettings?: boolean; keepTemplates?: boolean }): Promise<void> {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CERTIFICATES, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.BATCHES, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.MARK_SESSIONS, JSON.stringify([]));

    if (!options?.keepTemplates) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.TEMPLATES, JSON.stringify(PRESET_TEMPLATES));
    }
    if (!options?.keepSettings) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }

    try {
      await fetch('/api/data/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(options || {}),
      });
    } catch {
      // offline fallback
    }
  }

  // --- PUBLIC VERIFICATION ---
  async verifyCertificate(certNumber: string): Promise<VerificationResult> {
    const cleanNumber = certNumber.trim().toUpperCase();

    // 1. Try server if available
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(cleanNumber)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    // 2. Offline lookup from local storage
    const certs = await this.getCertificates();
    const cert = certs.find(
      (c) => c.certificateNumber.trim().toUpperCase() === cleanNumber
    );

    const settings = await this.getSettings();

    if (cert) {
      return {
        found: true,
        certificate: cert,
        settings: {
          companyName: settings.companyName,
          website: settings.website,
          logoUrl: settings.logoUrl,
          verificationBaseUrl: settings.verificationBaseUrl,
        },
      };
    }

    return {
      found: false,
      message: 'Certificate not found. Please verify the certificate number.',
      settings: {
        companyName: settings.companyName,
        website: settings.website,
        logoUrl: settings.logoUrl,
        verificationBaseUrl: settings.verificationBaseUrl,
      },
    };
  }

  // --- MARK SESSIONS ---
  async getMarkSessions(): Promise<MarkSession[]> {
    try {
      const res = await fetch('/api/marks/sessions', {
        headers: this.getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(LOCAL_STORAGE_KEYS.MARK_SESSIONS, JSON.stringify(data));
        return data;
      }
    } catch {
      this.isOnlineBackendAvailable = false;
    }
    const local = localStorage.getItem(LOCAL_STORAGE_KEYS.MARK_SESSIONS);
    return local ? JSON.parse(local) : [createDefaultMarkSession()];
  }

  async saveMarkSession(session: MarkSession): Promise<MarkSession> {
    const sessions = await this.getMarkSessions();
    const index = sessions.findIndex((s) => s.id === session.id);
    let updated: MarkSession[];
    if (index >= 0) {
      updated = [...sessions];
      updated[index] = session;
    } else {
      updated = [session, ...sessions];
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.MARK_SESSIONS, JSON.stringify(updated));

    try {
      await fetch('/api/marks/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
        body: JSON.stringify(session),
      });
    } catch {
      // offline fallback
    }
    return session;
  }

  async deleteMarkSession(sessionId: string): Promise<void> {
    const sessions = await this.getMarkSessions();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    localStorage.setItem(LOCAL_STORAGE_KEYS.MARK_SESSIONS, JSON.stringify(filtered));

    try {
      await fetch(`/api/marks/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });
    } catch {
      // offline fallback
    }
  }
}

export const api = new StorageService();
