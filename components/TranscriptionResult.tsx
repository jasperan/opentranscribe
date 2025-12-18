
import React from 'react';
import { Copy, Download, Check, RefreshCw } from 'lucide-react';

interface TranscriptionResultProps {
  text: string;
  fileName: string;
  onReset: () => void;
}

const TranscriptionResult: React.FC<TranscriptionResultProps> = ({ text, fileName, onReset }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.split('.')[0]}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-slate-200">Transcription Result</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Download as .txt"
          >
            <Download size={18} />
          </button>
          <button
            onClick={onReset}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="New transcription"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[200px] max-h-[500px] overflow-y-auto shadow-inner">
        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
          {text || "No text could be extracted."}
        </p>
      </div>
      
      <p className="text-xs text-slate-500 italic">
        File: {fileName}
      </p>
    </div>
  );
};

export default TranscriptionResult;
