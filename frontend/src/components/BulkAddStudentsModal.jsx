import { useState } from 'react';
import { X, Users, Sparkles, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export default function BulkAddStudentsModal({ isOpen, onClose, onSuccess }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('generate'); // 'generate' | 'import'

  // Batch Generator State
  const [genCount, setGenCount] = useState(10);
  const [genYear, setGenYear] = useState('1');
  const [genDept, setGenDept] = useState('Computer Science');
  const [genGender, setGenGender] = useState('MALE');
  const [genPassword, setGenPassword] = useState('Test@123');

  // CSV Paste State
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Handle CSV text change and live parse
  const handleCsvChange = (text) => {
    setCsvText(text);
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    const rows = [];
    const errs = [];

    lines.forEach((line, idx) => {
      // Skip header row if present
      if (idx === 0 && (line.toLowerCase().includes('first') || line.toLowerCase().includes('email') || line.toLowerCase().includes('reg'))) {
        return;
      }
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 4) {
        errs.push(`Line ${idx + 1}: Expected at least 4 comma-separated values (First, Last, Email, RegisterNo)`);
        return;
      }
      const [firstName, lastName, email, studentId, department = 'Computer Science', year = '1', gender = 'MALE', phone = ''] = parts;
      const cleanId = studentId.toUpperCase();
      if (cleanId.length !== 10) {
        errs.push(`Line ${idx + 1}: Register Number "${cleanId}" must be exactly 10 characters`);
      }
      rows.push({ firstName, lastName, email, studentId: cleanId, department, year, gender, phone });
    });

    setParsedRows(rows);
    setParseErrors(errs);
  };

  const handleBatchGenerate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/admin/students/bulk', {
        mode: 'generate',
        count: parseInt(genCount),
        year: parseInt(genYear),
        department: genDept,
        gender: genGender,
        defaultPassword: genPassword || 'Test@123',
      });

      toast({
        type: 'success',
        title: 'Batch Created',
        description: data.message || `Successfully created ${data.count} student accounts.`,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to generate student accounts.';
      toast({ type: 'error', title: 'Batch Generation Failed', description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleListImport = async () => {
    if (parsedRows.length === 0) {
      toast({ type: 'error', title: 'Empty Data', description: 'Please paste student records before importing.' });
      return;
    }
    if (parseErrors.length > 0) {
      toast({ type: 'error', title: 'Validation Errors', description: 'Please fix the errors in your pasted data before importing.' });
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/admin/students/bulk', {
        mode: 'list',
        students: parsedRows,
        defaultPassword: 'Test@123',
      });

      toast({
        type: 'success',
        title: 'Import Successful',
        description: data.message || `Successfully imported ${data.count} student accounts.`,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to import student accounts.';
      toast({ type: 'error', title: 'Import Failed', description: msg });
    } finally {
      setLoading(false);
    }
  };

  const yrPrefixMap = { '1': '26B95A...', '2': '25B95A...', '3': '24B95A...', '4': '23B95A...' };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Bulk Student Enrollment</h3>
                <p className="text-xs text-slate-500">Generate or import multiple student accounts into PostgreSQL</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 px-6 pt-2 bg-slate-50/30 gap-4">
            <button
              onClick={() => setTab('generate')}
              className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                tab === 'generate'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto Batch Generator
            </button>
            <button
              onClick={() => setTab('import')}
              className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                tab === 'import'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Paste CSV / Custom List
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {tab === 'generate' ? (
              <div className="space-y-4">
                {/* Count Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">Number of Student Accounts to Create</label>
                    <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                      {genCount} Accounts
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={genCount}
                    onChange={(e) => setGenCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                  />
                  <div className="flex gap-2 mt-2">
                    {[5, 10, 20, 30, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGenCount(num)}
                        className={`text-xs py-1 px-2.5 rounded-lg font-medium border transition-colors ${
                          genCount === num
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {num} Students
                      </button>
                    ))}
                  </div>
                </div>

                {/* Academic Year & Department */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="label">Academic Year</label>
                    <select className="input" value={genYear} onChange={(e) => setGenYear(e.target.value)}>
                      <option value="1">Year 1 (Prefix: 26B95A...)</option>
                      <option value="2">Year 2 (Prefix: 25B95A...)</option>
                      <option value="3">Year 3 (Prefix: 24B95A...)</option>
                      <option value="4">Year 4 (Prefix: 23B95A...)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Department</label>
                    <select className="input" value={genDept} onChange={(e) => setGenDept(e.target.value)}>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Information Tech">Information Technology</option>
                      <option value="AI & Data Science">AI & Data Science</option>
                      <option value="ECE">ECE</option>
                      <option value="EEE">EEE</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Civil">Civil</option>
                    </select>
                  </div>
                </div>

                {/* Gender & Default Password */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Gender</label>
                    <select className="input" value={genGender} onChange={(e) => setGenGender(e.target.value)}>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Default Password</label>
                    <input
                      type="text"
                      className="input font-mono text-xs"
                      value={genPassword}
                      onChange={(e) => setGenPassword(e.target.value)}
                    />
                  </div>
                </div>

                {/* Preview Box */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                  <p className="font-semibold text-slate-700">What will be generated:</p>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                    <li><strong className="text-slate-800">{genCount}</strong> unique students in {genDept} ({genGender})</li>
                    <li>Auto-assigned <strong className="text-slate-800">10-character SRKR IDs</strong> (e.g. {yrPrefixMap[genYear] || '26B95A...'})</li>
                    <li>Name-based unique Gmail addresses (e.g. <span className="font-mono text-slate-700">firstname.lastname@gmail.com</span>)</li>
                    <li>Pre-filled baseline room matching preferences</li>
                    <li>Approved status (<span className="text-emerald-600 font-semibold">Active & ready to log in</span>)</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0">Paste Student CSV Data</label>
                    <span className="text-[11px] text-slate-400">Format: First, Last, Email, RegisterNo (10 chars), Dept, Year, Gender, Phone</span>
                  </div>
                  <textarea
                    rows={6}
                    className="input font-mono text-xs leading-relaxed"
                    placeholder={`Kiran, Kumar, kiran.kumar@gmail.com, 26B95A0150, CSE, 1, MALE, 9876543210\nSuresh, Rao, suresh.rao@gmail.com, 26B95A0151, ECE, 1, MALE, 9876543211`}
                    value={csvText}
                    onChange={(e) => handleCsvChange(e.target.value)}
                  />
                </div>

                {/* Parsing Status */}
                {parsedRows.length > 0 && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Parsed <strong>{parsedRows.length}</strong> valid student records</span>
                    </div>
                  </div>
                )}

                {parseErrors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-red-800">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span>{parseErrors.length} Issue(s) detected:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {parseErrors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {parseErrors.length > 5 && <li>...and {parseErrors.length - 5} more</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            {tab === 'generate' ? (
              <button
                type="button"
                onClick={handleBatchGenerate}
                disabled={loading}
                className="btn-primary text-sm flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating {genCount} Accounts...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate {genCount} Students
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleListImport}
                disabled={loading || parsedRows.length === 0 || parseErrors.length > 0}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing {parsedRows.length} Records...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Import {parsedRows.length} Students
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
