import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, FileText, Lock } from 'lucide-react';
import { batchSaveSecrets, parseImportCSV } from '../services/secretService';

interface ImportViewProps {
  onComplete: () => void;
}

export const ImportView: React.FC<ImportViewProps> = ({ onComplete }) => {
  const [csvContent, setCsvContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setCsvContent(evt.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = () => {
    if (!csvContent) return;
    setIsProcessing(true);
    setTimeout(() => {
      const secrets = parseImportCSV(csvContent);
      batchSaveSecrets(secrets);
      setIsProcessing(false);
      onComplete();
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto pt-6 px-2 md:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Import Secrets</h1>
        <p className="text-slate-400">Securely ingest passwords from external providers.</p>
      </div>

      <div className="space-y-6">
        {/* Feasibility / Warning Card */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex flex-col md:flex-row gap-4 backdrop-blur-sm">
           <div className="bg-amber-500/10 p-3 rounded-full w-fit h-fit shrink-0">
             <Lock className="w-5 h-5 text-amber-500" />
           </div>
           <div>
              <h3 className="text-amber-200 font-semibold mb-1">Browser Sandbox Limitation</h3>
              <p className="text-amber-200/60 text-sm leading-relaxed">
                Direct syncing with system keychains (Apple/Google) is not possible in web apps. 
                Please export your passwords to <strong>CSV</strong> first.
              </p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProviderCard label="Google Passwords" sub="Export via passwords.google.com" icon="G" />
          <ProviderCard label="Apple Keychain" sub="Export via System Settings" icon="" />
        </div>

        {/* Upload Area */}
        <div className="relative group overflow-hidden rounded-3xl border border-dashed border-slate-700 bg-slate-900/30 hover:bg-slate-900/50 hover:border-brand-500/50 transition-all duration-300">
           <input 
             type="file" 
             accept=".csv" 
             onChange={handleFileUpload} 
             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
           />
           
           <div className="p-10 flex flex-col items-center justify-center text-center">
             {csvContent ? (
               <>
                 <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 text-emerald-400 animate-in zoom-in">
                    <FileText className="w-8 h-8" />
                 </div>
                 <h3 className="text-white font-medium text-lg">CSV Ready to Import</h3>
                 <p className="text-slate-500 text-sm mb-6">{csvContent.split('\n').length - 1} entries detected</p>
                 
                 <button 
                    onClick={(e) => { e.preventDefault(); handleImport(); }}
                    disabled={isProcessing}
                    className="relative z-20 px-8 py-3 bg-white text-black rounded-xl font-bold hover:scale-105 transition-transform"
                 >
                    {isProcessing ? 'Decrypting & Importing...' : 'Import to Vault'}
                 </button>
               </>
             ) : (
               <>
                 <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mb-4 text-brand-500 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(14,165,233,0.1)]">
                    <Upload className="w-7 h-7" />
                 </div>
                 <h3 className="text-white font-medium text-lg">Drop CSV File Here</h3>
                 <p className="text-slate-500 text-sm mt-1">or tap to browse files</p>
               </>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

const ProviderCard = ({ label, sub, icon }: any) => (
  <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5 flex items-center gap-4">
    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg font-bold text-slate-900 shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="text-white font-medium text-sm">{label}</h3>
      <p className="text-slate-500 text-xs">{sub}</p>
    </div>
  </div>
);