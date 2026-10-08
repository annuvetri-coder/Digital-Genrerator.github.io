import { NumberingConfig, StudentRecord } from '../types';

export function generateVerificationId(prefix: string, certNum: string): string {
  const cleanNum = certNum.replace(/[^a-zA-Z0-9]/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VRF-${cleanNum}-${rand}`;
}

export function formatCertificateNumber(
  prefix: string,
  num: number,
  paddingDigits = 4,
  suffix = ''
): string {
  const padded = String(num).padStart(paddingDigits, '0');
  return `${prefix}${padded}${suffix}`;
}

export function assignCertificateNumbers(
  rawStudents: Array<{
    id: string;
    serialNo: number | string;
    studentName: string;
    courseName: string;
    issueDate: string;
    extraFields?: Record<string, string>;
  }>,
  config: NumberingConfig,
  existingCertNumbers: Set<string> = new Set()
): StudentRecord[] {
  // 1. Sort according to mode
  const sorted = [...rawStudents];

  if (config.mode === 'alphabetical') {
    sorted.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
  } else if (config.mode === 'reg_no_order' || config.mode === 'sequential') {
    sorted.sort((a, b) => {
      const numA = Number(a.serialNo) || 0;
      const numB = Number(b.serialNo) || 0;
      return numA - numB;
    });
  }
  // If 'excel_order', retain original spreadsheet order

  // 2. Assign numbers
  let currentNum = config.startNumber;
  const assignedSet = new Set<string>();

  return sorted.map((item, index) => {
    // Generate next available number that doesn't conflict with existing or current batch
    let certNum = formatCertificateNumber(
      config.prefix,
      currentNum,
      config.paddingDigits,
      config.customSuffix
    );

    // Skip any numbers already in existing DB to ensure 100% uniqueness
    while (existingCertNumbers.has(certNum) || assignedSet.has(certNum)) {
      currentNum++;
      certNum = formatCertificateNumber(
        config.prefix,
        currentNum,
        config.paddingDigits,
        config.customSuffix
      );
    }

    assignedSet.add(certNum);
    currentNum++;

    const verificationId = generateVerificationId(config.prefix, certNum);

    return {
      id: item.id || `student-${index + 1}`,
      serialNo: item.serialNo || index + 1,
      studentName: item.studentName || '',
      courseName: item.courseName || '',
      issueDate: item.issueDate || '',
      certificateNumber: certNum,
      verificationId,
      extraFields: item.extraFields || {},
      status: 'valid',
    };
  });
}

export interface ValidationReport {
  isValid: boolean;
  criticalErrorsCount: number;
  warningsCount: number;
  errors: Array<{
    type: 'missing_name' | 'duplicate_name' | 'duplicate_number' | 'missing_field' | 'invalid_date';
    message: string;
    studentId?: string;
    studentName?: string;
  }>;
}

export function validateStudentBatch(
  students: StudentRecord[],
  existingCertNumbersInDb: Set<string> = new Set()
): { validatedStudents: StudentRecord[]; report: ValidationReport } {
  const errors: ValidationReport['errors'] = [];
  const certNumbersSeen = new Map<string, string>(); // certNumber -> studentName
  const studentNamesSeen = new Map<string, number>(); // studentName -> count

  const validatedStudents = students.map((student) => {
    const studentErrors: string[] = [];

    // 1. Missing name check
    if (!student.studentName || !student.studentName.trim()) {
      studentErrors.push('Student name is required');
      errors.push({
        type: 'missing_name',
        message: `Row #${student.serialNo} is missing a student name`,
        studentId: student.id,
      });
    } else {
      const cleanName = student.studentName.trim().toLowerCase();
      const count = studentNamesSeen.get(cleanName) || 0;
      studentNamesSeen.set(cleanName, count + 1);
      if (count >= 1) {
        errors.push({
          type: 'duplicate_name',
          message: `Duplicate student name detected: "${student.studentName}"`,
          studentId: student.id,
          studentName: student.studentName,
        });
      }
    }

    // 2. Duplicate Certificate Number in batch
    if (!student.certificateNumber) {
      studentErrors.push('Missing certificate number');
      errors.push({
        type: 'duplicate_number',
        message: `Student "${student.studentName || student.serialNo}" has no certificate number assigned`,
        studentId: student.id,
      });
    } else {
      if (certNumbersSeen.has(student.certificateNumber)) {
        studentErrors.push(`Duplicate certificate number: ${student.certificateNumber}`);
        errors.push({
          type: 'duplicate_number',
          message: `Duplicate certificate number "${student.certificateNumber}" shared between "${student.studentName}" and "${certNumbersSeen.get(student.certificateNumber)}"`,
          studentId: student.id,
          studentName: student.studentName,
        });
      } else {
        certNumbersSeen.set(student.certificateNumber, student.studentName);
      }

      // 3. Collision with existing certificates in DB
      if (existingCertNumbersInDb.has(student.certificateNumber)) {
        studentErrors.push(`Certificate number ${student.certificateNumber} already exists in database`);
        errors.push({
          type: 'duplicate_number',
          message: `Certificate number "${student.certificateNumber}" already exists in the certificate registry`,
          studentId: student.id,
          studentName: student.studentName,
        });
      }
    }

    // 4. Missing course
    if (!student.courseName || !student.courseName.trim()) {
      studentErrors.push('Missing course / program name');
    }

    // 5. Missing date
    if (!student.issueDate || !student.issueDate.trim()) {
      studentErrors.push('Missing issue date');
    }

    let status: StudentRecord['status'] = 'valid';
    if (studentErrors.some((e) => e.includes('name') || e.includes('Duplicate certificate'))) {
      status = 'error';
    } else if (studentErrors.length > 0) {
      status = 'warning';
    }

    return {
      ...student,
      status,
      validationErrors: studentErrors,
    };
  });

  const criticalErrorsCount = errors.filter(
    (e) => e.type === 'missing_name' || e.type === 'duplicate_number'
  ).length;

  const warningsCount = errors.length - criticalErrorsCount;

  return {
    validatedStudents,
    report: {
      isValid: criticalErrorsCount === 0,
      criticalErrorsCount,
      warningsCount,
      errors,
    },
  };
}
