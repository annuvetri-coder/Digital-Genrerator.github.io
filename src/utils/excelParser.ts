import * as XLSX from 'xlsx';
import { ExcelColumnMapping, StudentRecord } from '../types';

export interface ParsedSheetData {
  headers: string[];
  rows: Record<string, any>[];
  fileName: string;
  totalRows: number;
}

export function parseExcelFile(file: File): Promise<ParsedSheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames.length) {
          throw new Error('Excel file contains no sheets');
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: '',
          raw: false,
        });

        if (!jsonRows.length) {
          throw new Error('The uploaded spreadsheet appears to be empty');
        }

        const headers = Object.keys(jsonRows[0] || {});

        resolve({
          headers,
          rows: jsonRows,
          fileName: file.name,
          totalRows: jsonRows.length,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to read spreadsheet'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file from disk'));
    reader.readAsArrayBuffer(file);
  });
}

export function detectDefaultMappings(headers: string[]): ExcelColumnMapping {
  const findMatch = (candidates: string[]): string => {
    const lowerCandidates = candidates.map((c) => c.toLowerCase());
    for (const h of headers) {
      const clean = h.trim().toLowerCase();
      if (lowerCandidates.includes(clean)) return h;
    }
    // Partial search
    for (const h of headers) {
      const clean = h.trim().toLowerCase();
      if (lowerCandidates.some((c) => clean.includes(c) || c.includes(clean))) return h;
    }
    return '';
  };

  const studentNameCol = findMatch([
    'student name',
    'student',
    'name',
    'full name',
    'candidate name',
    'participant',
  ]);

  const courseCol = findMatch([
    'course',
    'course name',
    'program',
    'training',
    'workshop',
    'subject',
  ]);

  const dateCol = findMatch([
    'date',
    'issue date',
    'completion date',
    'cert date',
  ]);

  const serialNoCol = findMatch([
    's.no',
    'sno',
    'serial no',
    'sl.no',
    'sl no',
    'no',
    'id',
    'roll no',
  ]);

  return {
    studentNameColumn: studentNameCol || headers[0] || '',
    courseColumn: courseCol || (headers[1] || headers[0] || ''),
    dateColumn: dateCol || (headers[2] || headers[0] || ''),
    serialNoColumn: serialNoCol || '',
  };
}

export function generateSampleExcelFile(): void {
  const sampleData = [
    {
      'S.No': 1,
      'Student Name': 'Arun Kumar',
      'Course': 'IoT Training',
      'Date': '05-10-2026',
    },
    {
      'S.No': 2,
      'Student Name': 'Bala Kumar',
      'Course': 'IoT Training',
      'Date': '05-10-2026',
    },
    {
      'S.No': 3,
      'Student Name': 'Charan Raj',
      'Course': 'IoT Training',
      'Date': '05-10-2026',
    },
    {
      'S.No': 4,
      'Student Name': 'Divya S',
      'Course': 'IoT Training',
      'Date': '05-10-2026',
    },
    {
      'S.No': 5,
      'Student Name': 'Ezhil Maran',
      'Course': 'IoT Training',
      'Date': '05-10-2026',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  XLSX.writeFile(workbook, 'Students_Sample_IoT_Training.xlsx');
}

export function getSampleStudentsData(): StudentRecord[] {
  return [
    {
      id: 'sample-1',
      serialNo: 1,
      studentName: 'Arun Kumar',
      courseName: 'IoT Training',
      issueDate: '05 October 2026',
      certificateNumber: 'IYT-2026-0001',
      verificationId: 'VRF-IYT-0001',
      marks: {
        partA: { col1: 19, col2: 18, col3: 19, total: 56 },
        partB: { col1: 18, col2: 18, optional: 4, total: 40 },
        grandTotal: 96,
        maxMarks: 105,
        percentage: 91.4,
        grade: 'O',
        status: 'PASS',
      },
      extraFields: {},
      status: 'valid',
    },
    {
      id: 'sample-2',
      serialNo: 2,
      studentName: 'Bala Kumar',
      courseName: 'IoT Training',
      issueDate: '05 October 2026',
      certificateNumber: 'IYT-2026-0002',
      verificationId: 'VRF-IYT-0002',
      marks: {
        partA: { col1: 17, col2: 18, col3: 16, total: 51 },
        partB: { col1: 16, col2: 16, optional: 4, total: 36 },
        grandTotal: 87,
        maxMarks: 105,
        percentage: 82.9,
        grade: 'A+',
        status: 'PASS',
      },
      extraFields: {},
      status: 'valid',
    },
    {
      id: 'sample-3',
      serialNo: 3,
      studentName: 'Charan Raj',
      courseName: 'IoT Training',
      issueDate: '05 October 2026',
      certificateNumber: 'IYT-2026-0003',
      verificationId: 'VRF-IYT-0003',
      marks: {
        partA: { col1: 16, col2: 15, col3: 17, total: 48 },
        partB: { col1: 15, col2: 15, optional: 3, total: 33 },
        grandTotal: 81,
        maxMarks: 105,
        percentage: 77.1,
        grade: 'A',
        status: 'PASS',
      },
      extraFields: {},
      status: 'valid',
    },
    {
      id: 'sample-4',
      serialNo: 4,
      studentName: 'Divya S',
      courseName: 'IoT Training',
      issueDate: '05 October 2026',
      certificateNumber: 'IYT-2026-0004',
      verificationId: 'VRF-IYT-0004',
      marks: {
        partA: { col1: 20, col2: 19, col3: 20, total: 59 },
        partB: { col1: 19, col2: 19, optional: 5, total: 43 },
        grandTotal: 102,
        maxMarks: 105,
        percentage: 97.1,
        grade: 'O',
        status: 'PASS',
      },
      extraFields: {},
      status: 'valid',
    },
  ];
}
