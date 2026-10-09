import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { StudentRecord } from '../../types';
import { ValidationReport } from '../../utils/numberingEngine';

interface Step5Props {
  students: StudentRecord[];
  setStudents: React.Dispatch<React.SetStateAction<StudentRecord[]>>;
  validationReport: ValidationReport;
  onRegenerateNumbers: () => void;
}

export const Step5StudentPreview: React.FC<Step5Props> = ({
  students,
  setStudents,
  validationReport,
  onRegenerateNumbers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Student State
  const [newStudentName, setNewStudentName] = useState('');
  const [newCourseName, setNewCourseName] = useState(students[0]?.courseName || 'Professional Training Program');
  const [newIssueDate, setNewIssueDate] = useState(students[0]?.issueDate || '05 October 2026');

  const filteredStudents = students.filter(
    (s) =>
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.courseName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveEdit = () => {
    if (!editingStudent) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === editingStudent.id ? editingStudent : s))
    );
    setEditingStudent(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this student from the certificate batch?')) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleAddStudent = () => {
    if (!newStudentName.trim()) {
      alert('Please enter a student name');
      return;
    }
    const newStudent: StudentRecord = {
      id: `student-manual-${Date.now()}`,
      serialNo: students.length + 1,
      studentName: newStudentName.trim(),
      courseName: newCourseName.trim(),
      issueDate: newIssueDate.trim(),
      certificateNumber: `TEMP-${Date.now()}`,
      verificationId: `VRF-TEMP-${Date.now()}`,
      extraFields: {},
      status: 'valid',
    };

    setStudents((prev) => [...prev, newStudent]);
    setShowAddModal(false);
    setNewStudentName('');
    setTimeout(() => onRegenerateNumbers(), 50);
  };

  return (
    <div className="space-y-6">
      {/* Validation Status Banner */}
      {validationReport.criticalErrorsCount > 0 ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>
              Validation Report: {validationReport.criticalErrorsCount} critical error(s) must be resolved before generation
            </span>
          </div>
          <ul className="text-xs list-disc list-inside space-y-1 text-rose-700 pl-2">
            {validationReport.errors
              .filter((e) => e.type === 'missing_name' || e.type === 'duplicate_number')
              .map((err, i) => (
                <li key={i}>{err.message}</li>
              ))}
          </ul>
        </div>
      ) : validationReport.warningsCount > 0 ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>Notice: {validationReport.warningsCount} warnings detected</span>
          </div>
          <p className="text-xs text-amber-700">
            Duplicate student names or missing minor fields were found. Review below if intended.
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Pre-flight Validation Passed: All {students.length} student records are complete and unique!</span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            Ready to Generate
          </span>
        </div>
      )}

      {/* Controls Bar: Search, Regenerate, Add Student */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search students, course, cert number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onRegenerateNumbers}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate Numbers</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Student Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Course / Program</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Certificate Number</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s, idx) => {
                const hasError = s.status === 'error';
                return (
                  <tr
                    key={s.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      hasError ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-slate-400">{s.serialNo || idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {s.studentName || <span className="text-rose-500 italic">Missing Name</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{s.courseName}</td>
                    <td className="py-3 px-4 text-slate-500">{s.issueDate}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {s.certificateNumber}
                    </td>
                    <td className="py-3 px-4">
                      {hasError ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3" />
                          <span>Error</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Ready</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => setEditingStudent(s)}
                        title="Edit Student"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        title="Delete Student"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No students found. Upload an Excel spreadsheet or add students manually.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Edit Student Record</h3>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  value={editingStudent.studentName}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, studentName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  value={editingStudent.courseName}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, courseName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Issue Date
                </label>
                <input
                  type="text"
                  value={editingStudent.issueDate}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, issueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Certificate Number
                </label>
                <input
                  type="text"
                  value={editingStudent.certificateNumber}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, certificateNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add New Student</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arun Kumar"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Issue Date
                </label>
                <input
                  type="text"
                  value={newIssueDate}
                  onChange={(e) => setNewIssueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddStudent}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
