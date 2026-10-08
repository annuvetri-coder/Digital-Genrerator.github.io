import * as XLSX from 'xlsx';
import { ExcelColumnMapping, StudentRecord } from '../types';

export interface ParsedSheetData {
  headers: string[];
  rows: Record<string, any>[];
  fileName: string;
  totalRows: number;
  sheetNames?: string[];
  activeSheetName?: string;
}

/**
 * Robustly parses a raw worksheet 2D array by finding the true header row
 * even if the Excel file has title banners, blank lines, or merged cells at the top.
 */
function extractDataFromWorksheet(worksheet: XLSX.WorkSheet): { headers: string[]; rows: Record<string, any>[] } {
  // Convert sheet to 2D array of rows
  const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawMatrix || rawMatrix.length === 0) {
    return { headers: [], rows: [] };
  }

  // Look for the best header row within the first 10 rows
  let headerRowIndex = 0;
  let maxScore = -1;

  const headerKeywords = [
    'name', 'student', 'candidate', 'participant', 'course', 'program',
    'date', 'sno', 's.no', 'roll', 'id', 'sl', 'no', 'grade', 'marks', 'score'
  ];

  for (let r = 0; r < Math.min(10, rawMatrix.length); r++) {
    const row = rawMatrix[r];
    if (!Array.isArray(row)) continue;

    const nonBlank = row.filter((c) => c !== undefined && c !== null && String(c).trim() !== '');
    if (nonBlank.length === 0) continue;

    // Calculate score based on filled columns and recognized student keywords
    let keywordMatches = 0;
    nonBlank.forEach((val) => {
      const lower = String(val).toLowerCase();
      if (headerKeywords.some((kw) => lower.includes(kw))) {
        keywordMatches += 2;
      }
    });

    const score = nonBlank.length + keywordMatches;
    if (score > maxScore) {
      maxScore = score;
      headerRowIndex = r;
    }
  }

  const rawHeaderRow = rawMatrix[headerRowIndex] || [];
  // Build clean, unique header names
  const seenHeaders = new Map<string, number>();
  const headers: string[] = [];

  rawHeaderRow.forEach((cellVal: any, idx: number) => {
    let clean = String(cellVal || '').trim();
    if (!clean) clean = `Column_${idx + 1}`;
    
    // Deduplicate if identical header names exist
    const count = seenHeaders.get(clean) || 0;
    if (count > 0) {
      headers.push(`${clean}_${count + 1}`);
    } else {
      headers.push(clean);
    }
    seenHeaders.set(clean, count + 1);
  });

  // Extract data rows below the detected header row
  const rows: Record<string, any>[] = [];
  for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
    const rowData = rawMatrix[r];
    if (!Array.isArray(rowData)) continue;

    const rowObj: Record<string, any> = {};
    let hasAnyContent = false;

    headers.forEach((h, colIdx) => {
      const val = rowData[colIdx] !== undefined && rowData[colIdx] !== null ? String(rowData[colIdx]).trim() : '';
      rowObj[h] = val;
      if (val !== '') hasAnyContent = true;
    });

    // Only add non-empty rows
    if (hasAnyContent) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

export function parseExcelFile(file: File, requestedSheetName?: string): Promise<ParsedSheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: true,
        });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('The uploaded Excel spreadsheet contains no visible sheets.');
        }

        // Determine target sheet: use requested sheet, or find the first sheet with data
        let targetSheetName = requestedSheetName && workbook.Sheets[requestedSheetName]
          ? requestedSheetName
          : workbook.SheetNames[0];

        let extracted = extractDataFromWorksheet(workbook.Sheets[targetSheetName]);

        // If first sheet was blank/cover, search other sheets in workbook
        if (extracted.rows.length === 0 && workbook.SheetNames.length > 1) {
          for (const sName of workbook.SheetNames) {
            const candidate = extractDataFromWorksheet(workbook.Sheets[sName]);
            if (candidate.rows.length > 0) {
              targetSheetName = sName;
              extracted = candidate;
              break;
            }
          }
        }

        if (extracted.rows.length === 0) {
          throw new Error('No student data rows could be found in the uploaded file. Please make sure the sheet contains student records.');
        }

        resolve({
          headers: extracted.headers,
          rows: extracted.rows,
          fileName: file.name,
          totalRows: extracted.rows.length,
          sheetNames: workbook.SheetNames,
          activeSheetName: targetSheetName,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to read spreadsheet. Please ensure the file is not corrupted or password-protected.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file from disk. Please try selecting the file again.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses raw text pasted directly by user from Excel or Google Sheets (Tab-separated or CSV)
 */
export function parsePastedText(rawText: string): ParsedSheetData {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Please paste at least one row of student information.');
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('No rows found in pasted text.');
  }

  // Detect delimiter (Tab vs Comma vs Semicolon)
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount >= commaCount && tabCount > 0 ? '\t' : ',';

  const parseLine = (line: string): string[] => {
    if (delimiter === '\t') {
      return line.split('\t').map((c) => c.trim());
    }
    // Simple CSV parser supporting quotes
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h, idx) => h || `Column_${idx + 1}`);

  const rows: Record<string, any>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const rowObj: Record<string, any> = {};
    let hasContent = false;
    headers.forEach((h, idx) => {
      const v = values[idx] || '';
      rowObj[h] = v;
      if (v) hasContent = true;
    });
    if (hasContent) {
      rows.push(rowObj);
    }
  }

  if (rows.length === 0) {
    // If only 1 line was pasted, treat it as a single student with column "Student Name"
    if (headers.length === 1 && lines.length === 1) {
      return {
        headers: ['Student Name'],
        rows: [{ 'Student Name': headers[0] }],
        fileName: 'Pasted Student Record',
        totalRows: 1,
      };
    }
    throw new Error('Pasted text must contain at least a header row and one student data row.');
  }

  return {
    headers,
    rows,
    fileName: 'Pasted Spreadsheet Data',
    totalRows: rows.length,
  };
}

export function detectDefaultMappings(headers: string[]): ExcelColumnMapping {
  const findMatch = (candidates: string[]): string => {
    const lowerCandidates = candidates.map((c) => c.toLowerCase());
    
    // 1. Exact match
    for (const h of headers) {
      const clean = h.trim().toLowerCase();
      if (lowerCandidates.includes(clean)) return h;
    }
    
    // 2. Starts with or contains
    for (const h of headers) {
      const clean = h.trim().toLowerCase();
      if (lowerCandidates.some((c) => clean.includes(c) || c.includes(clean))) return h;
    }
    return '';
  };

  const studentNameCol = findMatch([
    'student name',
    'student',
    'candidate name',
    'candidate',
    'participant name',
    'participant',
    'name of the student',
    'name of student',
    'full name',
    'student_name',
    'learner name',
    'trainee name',
    'name',
  ]);

  const courseCol = findMatch([
    'course name',
    'course',
    'program',
    'program name',
    'training',
    'workshop',
    'event',
    'subject',
    'topic',
    'department',
    'branch',
    'class',
  ]);

  const dateCol = findMatch([
    'issue date',
    'completion date',
    'date of issue',
    'date of completion',
    'date',
    'cert date',
    'issued on',
    'passing date',
    'exam date',
  ]);

  const serialNoCol = findMatch([
    's.no',
    'sno',
    'serial no',
    'sl.no',
    'sl no',
    'roll no',
    'roll number',
    'reg no',
    'registration no',
    'register no',
    'id',
    'student id',
    'enrollment no',
    'no',
  ]);

  return {
    studentNameColumn: studentNameCol || headers[0] || '',
    courseColumn: courseCol || '',
    dateColumn: dateCol || '',
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
