import { MarkSession, StudentMarkEntry } from '../types';

export interface RawStudentMarkInput {
  id?: string;
  serialNo?: number;
  studentId?: string;
  studentName?: string;
  partA?: {
    col1?: number | null | '';
    col2?: number | null | '';
    col3?: number | null | '';
    total?: number;
  };
  partB?: {
    col1?: number | null | '';
    col2?: number | null | '';
    optional?: number | null | '';
    marks?: number | null | '';
    total?: number;
  };
  partC?: {
    marks?: number | null | '';
    title?: string;
  };
  isAbsent?: boolean;
  remarks?: string;
}

export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'O';
  if (percentage >= 80) return 'A+';
  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B+';
  if (percentage >= 50) return 'B';
  if (percentage >= 40) return 'C';
  return 'RA';
}

export function computeStudentMarkEntry(
  entry: RawStudentMarkInput,
  sessionConfig: Pick<MarkSession, 'partAConfig' | 'partBConfig' | 'partCConfig' | 'passingPercentage'>
): StudentMarkEntry {
  const isAbsent = Boolean(entry.isAbsent);

  // Part A: 1, 2, and 3 columns, 20 marks each -> 60 total
  const rawCol1 = entry.partA?.col1 !== undefined && entry.partA?.col1 !== '' ? Number(entry.partA.col1) : null;
  const rawCol2 = entry.partA?.col2 !== undefined && entry.partA?.col2 !== '' ? Number(entry.partA.col2) : null;
  const rawCol3 = entry.partA?.col3 !== undefined && entry.partA?.col3 !== '' ? Number(entry.partA.col3) : null;

  const validCol1 = rawCol1 !== null ? Math.min(Math.max(0, rawCol1), sessionConfig.partAConfig.col1Max || 20) : '';
  const validCol2 = rawCol2 !== null ? Math.min(Math.max(0, rawCol2), sessionConfig.partAConfig.col2Max || 20) : '';
  const validCol3 = rawCol3 !== null ? Math.min(Math.max(0, rawCol3), sessionConfig.partAConfig.col3Max || 20) : '';

  const partATotal =
    (typeof validCol1 === 'number' ? validCol1 : 0) +
    (typeof validCol2 === 'number' ? validCol2 : 0) +
    (typeof validCol3 === 'number' ? validCol3 : 0);

  // Part B: 1 (20 marks) and 2 (20 marks), and optional (5 marks if wanted)
  let rawB1 = entry.partB?.col1 !== undefined && entry.partB?.col1 !== '' ? Number(entry.partB.col1) : null;
  let rawB2 = entry.partB?.col2 !== undefined && entry.partB?.col2 !== '' ? Number(entry.partB.col2) : null;
  let rawBOpt =
    entry.partB?.optional !== undefined && entry.partB?.optional !== '' ? Number(entry.partB.optional) : null;

  // Backward compatibility fallback if legacy 'marks' is provided
  if (rawB1 === null && rawB2 === null && entry.partB?.marks !== undefined && entry.partB?.marks !== '') {
    const totalLegacy = Number(entry.partB.marks);
    rawB1 = Math.min(20, Math.floor(totalLegacy / 2));
    rawB2 = Math.min(20, totalLegacy - (rawB1 || 0));
  }

  const validB1 = rawB1 !== null ? Math.min(Math.max(0, rawB1), sessionConfig.partBConfig.col1Max || 20) : '';
  const validB2 = rawB2 !== null ? Math.min(Math.max(0, rawB2), sessionConfig.partBConfig.col2Max || 20) : '';
  const validBOpt =
    rawBOpt !== null ? Math.min(Math.max(0, rawBOpt), sessionConfig.partBConfig.optionalMax || 5) : '';

  const partBOptValue = typeof validBOpt === 'number' ? validBOpt : 0;
  const partBTotal =
    (typeof validB1 === 'number' ? validB1 : 0) +
    (typeof validB2 === 'number' ? validB2 : 0) +
    partBOptValue;

  // Part C: Optional
  const rawPartC =
    entry.partC?.marks !== undefined && entry.partC?.marks !== '' ? Number(entry.partC.marks) : null;
  const validPartC =
    rawPartC !== null ? Math.min(Math.max(0, rawPartC), sessionConfig.partCConfig.maxMarks || 20) : '';
  const partCTotal = sessionConfig.partCConfig.isEnabled && typeof validPartC === 'number' ? validPartC : 0;

  // Maximum Marks calculation:
  // Part A (60) + Part B [20 + 20 + (5 if optional enabled)] + Part C (20 if enabled)
  const partBMax =
    (sessionConfig.partBConfig.col1Max || 20) +
    (sessionConfig.partBConfig.col2Max || 20) +
    (sessionConfig.partBConfig.isOptionalEnabled ? sessionConfig.partBConfig.optionalMax || 5 : 0);

  const maxMarks =
    (sessionConfig.partAConfig.maxTotal || 60) +
    partBMax +
    (sessionConfig.partCConfig.isEnabled ? sessionConfig.partCConfig.maxMarks || 20 : 0);

  // Grand Total
  const grandTotal = isAbsent ? 0 : partATotal + partBTotal + partCTotal;

  // Percentage
  const percentage = isAbsent ? 0 : maxMarks > 0 ? Math.round((grandTotal / maxMarks) * 1000) / 10 : 0;

  // Grade & Status
  const grade = isAbsent ? 'AB' : calculateGrade(percentage);
  const passingPercent = sessionConfig.passingPercentage || 50;
  const status: StudentMarkEntry['status'] = isAbsent ? 'ABSENT' : percentage >= passingPercent ? 'PASS' : 'FAIL';

  return {
    id: entry.id || `stu-mark-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    serialNo: entry.serialNo || 1,
    studentId: entry.studentId || `STU-${String(entry.serialNo || 1).padStart(3, '0')}`,
    studentName: entry.studentName || 'Student Name',
    partA: {
      col1: validCol1,
      col2: validCol2,
      col3: validCol3,
      total: partATotal,
    },
    partB: {
      col1: validB1,
      col2: validB2,
      optional: validBOpt,
      total: partBTotal,
    },
    partC: {
      marks: validPartC,
      title: entry.partC?.title || 'Viva / Practical',
    },
    isAbsent,
    grandTotal,
    maxMarks,
    percentage,
    grade,
    status,
    remarks: entry.remarks || '',
  };
}

export function createDefaultMarkSession(): MarkSession {
  const sessionConfig = {
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
      maxTotal: 45, // 20 + 20 + 5 optional
      col1Max: 20,
      col1Label: '1',
      col2Max: 20,
      col2Label: '2',
      optionalMax: 5,
      optionalLabel: 'Optional',
      isOptionalEnabled: true, // Optional 5M column active
      label: 'Part B (1 & 2 @ 20M, Optional @ 5M)',
    },
    partCConfig: {
      isOptional: true,
      isEnabled: false, // Optional Part C initially disabled or toggled
      maxMarks: 20,
      label: 'Part C (Optional Viva / Practical)',
    },
    passingPercentage: 50,
  };

  const initialStudentsRaw = [
    {
      serialNo: 1,
      studentId: 'IYT-2026-001',
      studentName: 'Arun Kumar',
      partA: { col1: 19, col2: 18, col3: 19 },
      partB: { col1: 18, col2: 18, optional: 4 },
      partC: { marks: 18 },
    },
    {
      serialNo: 2,
      studentId: 'IYT-2026-002',
      studentName: 'Bala Kumar',
      partA: { col1: 17, col2: 18, col3: 16 },
      partB: { col1: 16, col2: 16, optional: 4 },
      partC: { marks: 16 },
    },
    {
      serialNo: 3,
      studentId: 'IYT-2026-003',
      studentName: 'Charan Raj',
      partA: { col1: 16, col2: 15, col3: 17 },
      partB: { col1: 15, col2: 15, optional: 3 },
      partC: { marks: 15 },
    },
    {
      serialNo: 4,
      studentId: 'IYT-2026-004',
      studentName: 'Divya S',
      partA: { col1: 20, col2: 19, col3: 20 },
      partB: { col1: 19, col2: 19, optional: 5 },
      partC: { marks: 19 },
    },
    {
      serialNo: 5,
      studentId: 'IYT-2026-005',
      studentName: 'Ezhil Maran',
      partA: { col1: 14, col2: 15, col3: 14 },
      partB: { col1: 14, col2: 14, optional: 2 },
      partC: { marks: 14 },
    },
  ];

  const students = initialStudentsRaw.map((s, idx) =>
    computeStudentMarkEntry(
      {
        ...s,
        id: `sample-student-${idx + 1}`,
      },
      sessionConfig
    )
  );

  return {
    id: 'session-iot-2026-oct',
    name: 'IoT Training — Comprehensive Examination & Practical Assessment',
    subjectName: 'IoT Architecture, Embedded Systems & Cloud Protocols',
    batchCode: 'IYT-IOT-2026-10',
    sessionDate: '2026-10-06',
    evaluatorName: 'Prof. S. Ranganathan (Head of Examination)',
    ...sessionConfig,
    students,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
