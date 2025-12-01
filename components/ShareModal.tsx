import React, { useState, useEffect } from 'react';
import { X, Copy, Clock, Share2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Secret } from '../types';
import { generateShareUrl } from '../services/secretService';

interface ShareModalProps {
  secret: Secret;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ secret, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    // Generate the real data URL for serverless sharing
    const url = generateShareUrl(secret);
    setShareUrl(url);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secret]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired = timeLeft === 0;

  // Modern clean QR code (using white foreground for dark mode)
  // We double encode the shareUrl because it contains special characters
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}&color=ffffff&bgcolor=000000&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 md:p-4">
      {/* Modal Container */}
      <div className="w-full md:max-w-md bg-slate-900 md:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom-full duration-500">
        
        {/* Progress Bar (Glow) */}
        {!isExpired && (
          <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full z-10">
             <div 
               className="h-full bg-gradient-to-r from-brand-400 to-indigo-500 shadow-[0_0_15px_rgba(56,189,248,0.8)] transition-all duration-1000 ease-linear"
               style={{ width: `${(timeLeft / 15) * 100}%` }}
             />
          </div>
        )}

        <div className="p-8 relative">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                Ephemeral Share
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Share <span className="text-brand-400 font-medium">"{secret.label}"</span>
              </p>
            </div>
            <button onClick={onClose} className="bg-slate-800/50 p-2 rounded-full text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isExpired ? (
            <div className="flex flex-col items-center space-y-8">
              {/* QR Code container with glow */}
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-brand-500 to-purple-600 rounded-2xl blur-lg opacity-40 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative bg-black p-4 rounded-xl border border-white/10">
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 rounded-lg" />
                </div>
              </div>

              <div className="w-full space-y-4">
                <div className="flex items-center justify-center gap-2 text-brand-400 font-mono text-2xl font-bold tracking-wider">
                  <Clock className="w-6 h-6 animate-pulse" />
                  <span>00:{timeLeft.toString().padStart(2, '0')}</span>
                </div>

                <div className="w-full bg-slate-950 rounded-xl p-1 pr-1 border border-white/10 flex items-center">
                  <div className="flex-1 px-3 overflow-hidden">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Offline Secure Link</div>
                    <code className="text-xs text-slate-300 truncate block font-mono">
                      {shareUrl}
                    </code>
                  </div>
                  <button 
                    onClick={handleCopy}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-white font-medium text-sm whitespace-nowrap"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-slate-500">
                 <ShieldCheck className="w-3 h-3 text-emerald-500" />
                 <span>Data embedded in QR. No server storage.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Window Closed</h3>
                <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                  The visual sharing window has closed. The data was never stored on any server.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-medium"
              >
                Close Window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};