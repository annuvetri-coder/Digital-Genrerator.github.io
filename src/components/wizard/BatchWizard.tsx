import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileSpreadsheet,
  FolderGit2,
  Hash,
  Layers,
  Sparkles,
  Table,
} from 'lucide-react';
import {
  CertificateBatch,
  CertificateTemplate,
  ExcelColumnMapping,
  NumberingConfig,
  StudentRecord,
} from '../../types';
import { PRESET_TEMPLATES } from '../../utils/defaultTemplates';
import { getSampleStudentsData, ParsedSheetData } from '../../utils/excelParser';
import {
  assignCertificateNumbers,
  validateStudentBatch,
  ValidationReport,
} from '../../utils/numberingEngine';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { Step1DetailsTemplate } from './Step1DetailsTemplate';
import { Step2TemplateEditor } from './Step2TemplateEditor';
import { Step3ExcelMapping } from './Step3ExcelMapping';
import { Step4NumberingSettings } from './Step4NumberingSettings';
import { Step5StudentPreview } from './Step5StudentPreview';
import { Step6LivePreviewGenerate } from './Step6LivePreviewGenerate';

interface BatchWizardProps {
  onFinish: () => void;
  onVerifyCertificate: (certNum: string) => void;
}

export const BatchWizard: React.FC<BatchWizardProps> = ({ onFinish, onVerifyCertificate }) => {
  const { settings } = useSettings();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Batch & Template
  const [batchName, setBatchName] = useState('IoT Training – October 2026');
  const [batchId, setBatchId] = useState('IYT-IOT-2026-10');
  const [courseName, setCourseName] = useState('IoT Training');
  const [issueDate, setIssueDate] = useState('05 October 2026');
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate>(PRESET_TEMPLATES[0]);
  const [savedTemplates, setSavedTemplates] = useState<CertificateTemplate[]>(PRESET_TEMPLATES);

  // Step 3: Excel Data & Mapping
  const [parsedData, setParsedData] = useState<ParsedSheetData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ExcelColumnMapping>({
    studentNameColumn: '',
    courseColumn: '',
    dateColumn: '',
    serialNoColumn: '',
  });

  // Step 4: Numbering Config
  const [numberingConfig, setNumberingConfig] = useState<NumberingConfig>({
    mode: 'sequential',
    prefix: settings.certificatePrefix || 'IYT-2026-',
    startNumber: settings.defaultStartNumber || 1,
    paddingDigits: settings.numberPadding || 4,
  });

  // Students list
  const [students, setStudents] = useState<StudentRecord[]>(getSampleStudentsData());
  const [validationReport, setValidationReport] = useState<ValidationReport>({
    isValid: true,
    criticalErrorsCount: 0,
    warningsCount: 0,
    errors: [],
  });

  // Existing certificate numbers from database
  const [existingCertNumbers, setExistingCertNumbers] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadInitial() {
      try {
        const [tmpls, certs] = await Promise.all([api.getTemplates(), api.getCertificates()]);
        if (tmpls.length) setSavedTemplates(tmpls);
        const set = new Set(certs.map((c) => c.certificateNumber));
        setExistingCertNumbers(set);
      } catch (err) {
        console.error('Failed to load initial data for wizard:', err);
      }
    }
    loadInitial();
  }, []);

  // Update numbering settings when company settings load
  useEffect(() => {
    if (settings.certificatePrefix) {
      setNumberingConfig((prev) => ({
        ...prev,
        prefix: settings.certificatePrefix,
        startNumber: settings.defaultStartNumber || 1,
        paddingDigits: settings.numberPadding || 4,
      }));
    }
  }, [settings]);

  // Handle Loading sample data
  const handleLoadSampleData = () => {
    const samples = getSampleStudentsData();
    setStudents(samples);
    setParsedData({
      headers: ['S.No', 'Student Name', 'Course', 'Date'],
      rows: samples.map((s) => ({
        'S.No': s.serialNo,
        'Student Name': s.studentName,
        'Course': s.courseName,
        'Date': s.issueDate,
      })),
      fileName: 'Sample_IoT_Students.xlsx',
      totalRows: samples.length,
    });
    setColumnMapping({
      studentNameColumn: 'Student Name',
      courseColumn: 'Course',
      dateColumn: 'Date',
      serialNoColumn: 'S.No',
    });
  };

  const handleSaveAsCustomTemplate = async (templateToSave: CertificateTemplate) => {
    const saved = await api.saveTemplate(templateToSave);
    setSavedTemplates((prev) => [saved, ...prev.filter((t) => t.id !== saved.id)]);
    setSelectedTemplate(saved);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    await api.deleteTemplate(templateId);
    setSavedTemplates((prev) => prev.filter((t) => t.id !== templateId));
    if (selectedTemplate.id === templateId) {
      setSelectedTemplate(savedTemplates.find((t) => t.id !== templateId) || PRESET_TEMPLATES[0]);
    }
  };

  // Convert parsed Excel data to raw students whenever mapping or parsedData changes
  const applyExcelMappingToStudents = () => {
    if (!parsedData || !columnMapping.studentNameColumn) return;

    // Filter out rows where student name is empty or all blank
    const validRows = parsedData.rows.filter((row) => {
      const name = String(row[columnMapping.studentNameColumn] || '').trim();
      return name.length > 0;
    });

    if (validRows.length === 0) {
      alert(`No valid student names found in column "${columnMapping.studentNameColumn}". Please select the correct column.`);
      return;
    }

    const raw = validRows.map((row, idx) => {
      const name = String(row[columnMapping.studentNameColumn] || '').trim();
      const course = columnMapping.courseColumn
        ? String(row[columnMapping.courseColumn] || '').trim()
        : courseName;
      const date = columnMapping.dateColumn
        ? String(row[columnMapping.dateColumn] || '').trim()
        : issueDate;
      const sno = columnMapping.serialNoColumn
        ? row[columnMapping.serialNoColumn] || idx + 1
        : idx + 1;

      return {
        id: `student-${idx + 1}-${Date.now()}`,
        serialNo: sno,
        studentName: name,
        courseName: course || courseName,
        issueDate: date || issueDate,
      };
    });

    const assigned = assignCertificateNumbers(raw, numberingConfig, existingCertNumbers);
    setStudents(assigned);
  };

  // Re-run numbering assignment
  const handleRegenerateNumbers = () => {
    const assigned = assignCertificateNumbers(students, numberingConfig, existingCertNumbers);
    const { validatedStudents, report } = validateStudentBatch(assigned, existingCertNumbers);
    setStudents(validatedStudents);
    setValidationReport(report);
  };

  const steps = [
    { num: 1, title: 'Batch & Template', icon: FolderGit2 },
    { num: 2, title: 'Template Editor', icon: Layers },
    { num: 3, title: 'Excel Mapping', icon: FileSpreadsheet },
    { num: 4, title: 'Numbering', icon: Hash },
    { num: 5, title: 'Student Roster', icon: Table },
    { num: 6, title: 'Generate & Export', icon: Sparkles },
  ];

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!batchName.trim()) {
        alert('Please enter a batch name');
        return;
      }
    }
    if (currentStep === 3) {
      if (!parsedData) {
        alert('Please upload your Excel/CSV file or click "Use Sample Data" before continuing.');
        return;
      }
      if (!columnMapping.studentNameColumn) {
        alert('Please map the "Student Name Column" before continuing.');
        return;
      }
      applyExcelMappingToStudents();
    }
    if (currentStep === 4) {
      handleRegenerateNumbers();
    }
    if (currentStep === 5) {
      if (!validationReport.isValid) {
        alert('Please resolve all critical validation errors before proceeding to generation.');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="space-y-6">
      {/* Wizard Header & Breadcrumb Steps */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Certificate Generation Wizard
            </h1>
            <p className="text-xs text-slate-500">
              Configure batch details, visual template, Excel student roster, and automated numbering.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 w-fit">
            Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
          </span>
        </div>

        {/* Stepper Tabs */}
        <div className="flex items-center overflow-x-auto pb-2 scrollbar-none gap-2">
          {steps.map((st) => {
            const Icon = st.icon;
            const isCompleted = currentStep > st.num;
            const isCurrent = currentStep === st.num;

            return (
              <button
                key={st.num}
                type="button"
                onClick={() => {
                  if (st.num < currentStep || validationReport.isValid) {
                    setCurrentStep(st.num);
                  }
                }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-white text-indigo-700'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : st.num}
                </div>
                <span>{st.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div>
        {currentStep === 1 && (
          <Step1DetailsTemplate
            batchName={batchName}
            setBatchName={setBatchName}
            batchId={batchId}
            setBatchId={setBatchId}
            courseName={courseName}
            setCourseName={setCourseName}
            issueDate={issueDate}
            setIssueDate={setIssueDate}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            savedTemplates={savedTemplates}
            onAddCustomTemplate={handleSaveAsCustomTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        )}

        {currentStep === 2 && (
          <Step2TemplateEditor
            template={selectedTemplate}
            onUpdateTemplate={setSelectedTemplate}
            onSaveAsCustomTemplate={handleSaveAsCustomTemplate}
          />
        )}

        {currentStep === 3 && (
          <Step3ExcelMapping
            mapping={columnMapping}
            setMapping={setColumnMapping}
            parsedData={parsedData}
            setParsedData={setParsedData}
            onLoadSampleData={handleLoadSampleData}
            courseNameFallback={courseName}
            issueDateFallback={issueDate}
          />
        )}

        {currentStep === 4 && (
          <Step4NumberingSettings
            config={numberingConfig}
            setConfig={setNumberingConfig}
            sampleStudents={students}
          />
        )}

        {currentStep === 5 && (
          <Step5StudentPreview
            students={students}
            setStudents={setStudents}
            validationReport={validationReport}
            onRegenerateNumbers={handleRegenerateNumbers}
          />
        )}

        {currentStep === 6 && (
          <Step6LivePreviewGenerate
            batchName={batchName}
            batchId={batchId}
            courseName={courseName}
            issueDate={issueDate}
            template={selectedTemplate}
            students={students}
            onFinishAndGoToBatches={onFinish}
            onVerifyCertificate={onVerifyCertificate}
          />
        )}
      </div>

      {/* Bottom Step Navigation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <button
          type="button"
          disabled={currentStep === 1}
          onClick={handlePrevStep}
          className={`inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentStep === 1
              ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100'
              : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center space-x-2">
          {currentStep < 6 && (
            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all"
            >
              <span>Continue to {steps[currentStep].title}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
