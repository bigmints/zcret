
import React, { useState, useEffect } from 'react';
import { Shield, Delete, Lock, KeyRound, AlertTriangle, RefreshCw, CheckCircle, ChevronRight } from 'lucide-react';
import { setupAuth, verifyPin, verifyRecoveryPhrase, wipeVault } from '../services/authService';

interface LockScreenProps {
  onUnlock: () => void;
  isSetupMode: boolean;
}

type Mode = 'SETUP_CREATE' | 'SETUP_CONFIRM' | 'SETUP_SUCCESS' | 'UNLOCK' | 'RECOVERY_MENU' | 'RECOVERY_PHRASE';

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, isSetupMode }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mode, setMode] = useState<Mode>(isSetupMode ? 'SETUP_CREATE' : 'UNLOCK');
  const [error, setError] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [inputPhrase, setInputPhrase] = useState('');
  const [shake, setShake] = useState(false);

  // Keypad numbers
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'Forgot?', 0, 'Delete'];

  const handlePress = (key: string | number) => {
    setError('');
    
    if (key === 'Delete') {
      setPin(prev => prev.slice(0, -1));
      return;
    }
    
    if (key === 'Forgot?') {
      setMode('RECOVERY_MENU');
      return;
    }

    if (pin.length < 4) {
      setPin(prev => prev + key.toString());
    }
  };

  // Effect to handle PIN completion
  useEffect(() => {
    const checkPin = async () => {
      if (pin.length === 4) {
        // Small delay for UX
        await new Promise(r => setTimeout(r, 100));

        if (mode === 'UNLOCK') {
          const isValid = await verifyPin(pin);
          if (isValid) {
            onUnlock();
          } else {
            triggerError('Incorrect PIN');
          }
        } else if (mode === 'SETUP_CREATE') {
          setConfirmPin(pin);
          setPin('');
          setMode('SETUP_CONFIRM');
        } else if (mode === 'SETUP_CONFIRM') {
          if (pin === confirmPin) {
            const phrase = await setupAuth(pin);
            setRecoveryPhrase(phrase);
            setMode('SETUP_SUCCESS');
          } else {
            triggerError('PINs do not match');
            setMode('SETUP_CREATE'); // Restart setup
          }
        }
      }
    };
    checkPin();
  }, [pin, mode, confirmPin, onUnlock]);

  const triggerError = (msg: string) => {
    setShake(true);
    setError(msg);
    setTimeout(() => {
      setShake(false);
      setPin('');
    }, 500);
  };

  const handleRecoverySubmit = () => {
    if (verifyRecoveryPhrase(inputPhrase)) {
      setMode('SETUP_CREATE'); // Allow resetting PIN
      setPin('');
      setInputPhrase('');
    } else {
      setError('Invalid Phrase');
    }
  };

  if (mode === 'SETUP_SUCCESS') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 animate-in fade-in">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 text-emerald-500">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">PIN Set Successfully</h2>
        <p className="text-slate-400 text-center mb-8 max-w-xs">
          Save this recovery phrase. It's the only way to reset your PIN without losing data.
        </p>
        
        <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-2xl mb-8 w-full max-w-sm">
          <p className="text-emerald-400 font-mono text-xl text-center font-bold tracking-wider select-all">
            {recoveryPhrase}
          </p>
        </div>

        <button 
          onClick={onUnlock}
          className="w-full max-w-sm py-4 bg-white text-slate-950 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
        >
          Enter Vault <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  if (mode === 'RECOVERY_MENU') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in slide-in-from-bottom-10">
        <h2 className="text-2xl font-bold text-white mb-8">Reset Options</h2>
        
        <div className="w-full max-w-sm space-y-4">
          <button 
            onClick={() => setMode('RECOVERY_PHRASE')}
            className="w-full p-6 bg-slate-900 border border-white/10 rounded-2xl flex items-center gap-4 hover:bg-slate-800 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Use Recovery Phrase</h3>
              <p className="text-slate-500 text-xs mt-1">Reset PIN without data loss</p>
            </div>
          </button>

          <button 
            onClick={() => {
              if (window.confirm("ARE YOU SURE? This will permanently delete all secrets and reset the app.")) {
                wipeVault();
              }
            }}
            className="w-full p-6 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center gap-4 hover:bg-red-500/10 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-red-400 font-semibold">Wipe Vault & Reset</h3>
              <p className="text-red-500/60 text-xs mt-1">Delete everything and start over</p>
            </div>
          </button>

          <button 
            onClick={() => {
               setMode('UNLOCK');
               setPin('');
            }}
            className="mt-8 text-slate-500 w-full text-center py-4"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'RECOVERY_PHRASE') {
    return (
       <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
          <h2 className="text-xl font-bold text-white mb-2">Recovery Mode</h2>
          <p className="text-slate-400 text-sm mb-8">Enter your 4-word recovery phrase</p>
          
          <input 
            type="text" 
            value={inputPhrase}
            onChange={(e) => setInputPhrase(e.target.value)}
            className="w-full max-w-sm bg-slate-900 border border-white/10 p-4 rounded-xl text-white text-center mb-2 focus:border-brand-500 outline-none"
            placeholder="word1 word2 word3 word4"
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          
          <button 
            onClick={handleRecoverySubmit}
            className="w-full max-w-sm py-3 bg-brand-600 text-white rounded-xl font-bold mt-4"
          >
            Verify & Reset PIN
          </button>
          <button 
            onClick={() => setMode('RECOVERY_MENU')}
            className="mt-4 text-slate-500"
          >
            Back
          </button>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="z-10 w-full max-w-xs flex flex-col items-center">
        <div className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 mb-6">
             {mode.includes('SETUP') ? <KeyRound className="w-8 h-8 text-white" /> : <Shield className="w-8 h-8 text-white" />}
          </div>
          <h2 className="text-xl font-medium text-white tracking-wide">
            {mode === 'SETUP_CREATE' && "Create PIN"}
            {mode === 'SETUP_CONFIRM' && "Confirm PIN"}
            {mode === 'UNLOCK' && "WhisperVault Locked"}
          </h2>
          <p className="text-slate-500 text-sm mt-2 h-4">
             {error ? <span className="text-red-500 animate-pulse">{error}</span> : (mode === 'UNLOCK' ? 'Enter PIN to access' : 'Set a secure access code')}
          </p>
        </div>

        {/* PIN Dots */}
        <div className={`flex gap-6 mb-12 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
           {[0, 1, 2, 3].map(i => (
             <div 
               key={i} 
               className={`w-4 h-4 rounded-full transition-all duration-300 ${
                 i < pin.length 
                   ? 'bg-brand-400 scale-110 shadow-[0_0_10px_rgba(56,189,248,0.8)]' 
                   : 'bg-slate-800'
               }`} 
             />
           ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-6 w-full px-4">
           {keys.map((key, idx) => (
             <div key={idx} className="flex items-center justify-center">
               {key === 'Delete' ? (
                 <button 
                   onClick={() => handlePress(key)}
                   className="w-16 h-16 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                 >
                   <Delete className="w-6 h-6" />
                 </button>
               ) : key === 'Forgot?' ? (
                 <button 
                   onClick={() => mode === 'UNLOCK' && handlePress(key)}
                   className={`text-xs font-medium ${mode === 'UNLOCK' ? 'text-brand-500 hover:text-brand-400' : 'text-transparent pointer-events-none'}`}
                 >
                   Forgot?
                 </button>
               ) : (
                 <button 
                   onClick={() => handlePress(key)}
                   className="w-16 h-16 rounded-full bg-slate-900/50 border border-white/5 hover:bg-slate-800 hover:border-white/20 active:bg-brand-500/20 active:border-brand-500 text-2xl font-light text-white transition-all duration-150 backdrop-blur-sm shadow-lg flex items-center justify-center"
                 >
                   {key}
                 </button>
               )}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
