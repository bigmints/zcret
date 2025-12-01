
import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Search, 
  Wifi, 
  Key, 
  FileText, 
  CreditCard, 
  Trash2, 
  Share2, 
  Eye, 
  EyeOff,
  Home,
  Import,
  Sparkles,
  ChevronRight,
  LogOut,
  X,
  User,
  Download,
  Check,
  Copy,
  Lock
} from 'lucide-react';
import { AppView, Secret } from './types';
import { getSecrets, saveSecret, deleteSecret, parseShareData, generateVCard } from './services/secretService';
import { analyzePasswordStrength, generateSecurePassword } from './services/geminiService';
import { hasAuth } from './services/authService';
import { ShareModal } from './components/ShareModal';
import { ImportView } from './components/ImportView';
import { LockScreen } from './components/LockScreen';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthSetup, setIsAuthSetup] = useState(false);
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [shareSecret, setShareSecret] = useState<Secret | null>(null);

  // Shared Secret State
  const [receivedSecret, setReceivedSecret] = useState<Secret | null>(null);

  // Create Form State
  const [newSecretLabel, setNewSecretLabel] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [newSecretUsername, setNewSecretUsername] = useState('');
  const [newSecretCategory, setNewSecretCategory] = useState<Secret['category']>('login');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{score: number, feedback: string[]} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Check if user has PIN setup
    const hasPin = hasAuth();
    setIsAuthSetup(hasPin);

    // 1. Check for Shared Link Hash on Load
    // Even for shared links, we might want to prompt for PIN if the user has one? 
    // Usually share links are public ephemeral, so we might skip auth for that specific view
    // But to save it to vault, they need auth. 
    // For now, let's keep share view public, but main app protected.
    const hash = window.location.hash;
    if (hash.startsWith('#share')) {
      const params = new URLSearchParams(hash.substring(6)); // remove #share
      const encodedData = params.get('data');
      if (encodedData) {
        const secret = parseShareData(encodedData);
        if (secret) {
          setReceivedSecret(secret);
          setView(AppView.SHARED_LINK);
          // Auto-authenticate for share view so they can see the specific secret
          // But full access requires unlocking if they navigate away
          setIsAuthenticated(true); 
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      }
    }

    if (!hasPin) {
      // If no PIN, we treat as not authenticated but allow setup
      setIsAuthenticated(false);
    }
    
    // Load secrets only if authenticated (this logic moves to render or effect dependency)
  }, []); 

  useEffect(() => {
    if (isAuthenticated && view !== AppView.SHARED_LINK) {
      setSecrets(getSecrets());
    }
  }, [isAuthenticated, view]);

  const toggleShowValue = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretLabel || !newSecretValue) return;

    let strength = 0;
    // Simple local strength calc fallback
    if (newSecretValue.length > 8) strength += 30;
    if (/[A-Z]/.test(newSecretValue)) strength += 20;
    if (/[0-9]/.test(newSecretValue)) strength += 20;
    if (/[0-9]/.test(newSecretValue)) strength += 20;
    if (/[^A-Za-z0-9]/.test(newSecretValue)) strength += 30;

    const isTextContent = newSecretCategory === 'note' || newSecretCategory === 'contact';

    const secret: Secret = {
      id: crypto.randomUUID(),
      label: newSecretLabel,
      value: newSecretValue,
      username: newSecretUsername,
      category: newSecretCategory,
      createdAt: Date.now(),
      strengthScore: isTextContent ? undefined : (aiAnalysis?.score || strength)
    };

    saveSecret(secret);
    
    setNewSecretLabel('');
    setNewSecretValue('');
    setNewSecretUsername('');
    setAiAnalysis(null);
    setView(AppView.DASHBOARD);
  };

  const handleAiGenerate = async () => {
    setIsGenerating(true);
    const pass = await generateSecurePassword(newSecretLabel);
    setNewSecretValue(pass);
    setIsGenerating(false);
    handleAiAnalyze(pass);
  };

  const handleAiAnalyze = async (val: string) => {
    if (!val) return;
    if (newSecretCategory === 'contact' || newSecretCategory === 'note') return; // Don't analyze notes/contacts
    
    setIsAnalyzing(true);
    const result = await analyzePasswordStrength(val);
    setAiAnalysis({ score: result.score, feedback: result.feedback });
    setIsAnalyzing(false);
  };

  const filteredSecrets = secrets.filter(s => 
    s.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryIcon = (cat: Secret['category']) => {
    switch (cat) {
      case 'wifi': return <Wifi className="w-5 h-5" />;
      case 'card': return <CreditCard className="w-5 h-5" />;
      case 'note': return <FileText className="w-5 h-5" />;
      case 'contact': return <User className="w-5 h-5" />;
      default: return <Key className="w-5 h-5" />;
    }
  };

  // Helper to get form labels based on category
  const getFormConfig = (cat: Secret['category']) => {
    switch(cat) {
      case 'contact':
        return {
          label: 'Full Name',
          labelPlaceholder: 'e.g. John Doe',
          user: 'Phone or Email',
          userPlaceholder: '+1 555 0123',
          value: 'Address & Notes',
          valuePlaceholder: 'Home address, door codes, birthday...'
        };
      case 'wifi':
        return {
          label: 'Network Name (SSID)',
          labelPlaceholder: 'MyHomeWiFi',
          user: 'Security Type',
          userPlaceholder: 'WPA2 / WPA3',
          value: 'Password',
          valuePlaceholder: 'WiFi Password'
        };
      case 'card':
        return {
          label: 'Card Nickname',
          labelPlaceholder: 'My Visa Platinum',
          user: 'Cardholder Name',
          userPlaceholder: 'Name on card',
          value: 'Card Details',
          valuePlaceholder: 'Number, CVV, Expiry...'
        };
      case 'note':
        return {
          label: 'Title',
          labelPlaceholder: 'Project Alpha Keys',
          user: 'Tags/Context',
          userPlaceholder: 'work, personal',
          value: 'Content',
          valuePlaceholder: 'Type your secure note here...'
        };
      default: // login
        return {
          label: 'Service Name',
          labelPlaceholder: 'e.g. Netflix',
          user: 'Username / Email',
          userPlaceholder: 'email@example.com',
          value: 'Password',
          valuePlaceholder: 'Secure password...'
        };
    }
  };

  const formConfig = getFormConfig(newSecretCategory);
  const showAiTools = newSecretCategory === 'login' || newSecretCategory === 'wifi';

  // --- AUTH GUARD ---
  if (!isAuthenticated && view !== AppView.SHARED_LINK) {
    return (
      <LockScreen 
        isSetupMode={!isAuthSetup} 
        onUnlock={() => {
          setIsAuthenticated(true);
          setIsAuthSetup(true);
        }} 
      />
    );
  }

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden flex flex-col md:flex-row">
      
      {/* Desktop Sidebar (Hide in Shared Link View on Mobile) */}
      {view !== AppView.SHARED_LINK && (
        <aside className="hidden md:flex flex-col w-72 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 p-6 z-20">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">WhisperVault</span>
          </div>

          <nav className="space-y-2 flex-1">
            <NavItem 
              icon={<Home className="w-5 h-5" />} 
              label="Vault" 
              active={view === AppView.DASHBOARD} 
              onClick={() => setView(AppView.DASHBOARD)} 
            />
            <NavItem 
              icon={<Plus className="w-5 h-5" />} 
              label="New Secret" 
              active={view === AppView.CREATE} 
              onClick={() => setView(AppView.CREATE)} 
            />
            <NavItem 
              icon={<Import className="w-5 h-5" />} 
              label="Import" 
              active={view === AppView.IMPORT} 
              onClick={() => setView(AppView.IMPORT)} 
            />
          </nav>
          
          <div className="pt-6 border-t border-white/5 space-y-4">
            <button 
              onClick={() => setIsAuthenticated(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
               <Lock className="w-5 h-5" />
               <span className="font-medium">Lock Vault</span>
            </button>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Sync Status</h4>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-300">Local PWA (Ready)</span>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        
        {/* Mobile Header (Hide in Shared View to focus on content) */}
        {view !== AppView.SHARED_LINK && (
          <div className="md:hidden h-16 flex items-center justify-between px-4 bg-slate-950/80 backdrop-blur-md border-b border-white/5 z-20 sticky top-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">WhisperVault</span>
            </div>
            <button 
              onClick={() => setIsAuthenticated(false)}
              className="p-2 bg-slate-900 rounded-full border border-white/10 text-slate-400"
            >
               <Lock className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 md:p-10 scroll-smooth no-scrollbar">
          
          {/* VIEW: DASHBOARD */}
          {view === AppView.DASHBOARD && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="sticky top-0 z-10 pt-2 pb-4 -mt-2 bg-slate-950/0 backdrop-blur-0">
                 {/* Search Bar - Modernized */}
                 <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center px-4 py-3 shadow-xl">
                      <Search className="w-5 h-5 text-slate-500 mr-3" />
                      <input 
                        type="text" 
                        placeholder="Search your secure vault..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none focus:outline-none text-white placeholder:text-slate-500 w-full text-base"
                      />
                    </div>
                 </div>
              </div>

              {secrets.length === 0 ? (
                <EmptyState setView={setView} />
              ) : (
                <div className="grid grid-cols-1 gap-3 pb-8">
                  {filteredSecrets.map(secret => (
                    <SecretCard 
                      key={secret.id} 
                      secret={secret} 
                      showValue={!!showValues[secret.id]}
                      onToggleValue={() => toggleShowValue(secret.id)}
                      onShare={() => setShareSecret(secret)}
                      onDelete={() => {
                         deleteSecret(secret.id);
                         setSecrets(getSecrets());
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: CREATE */}
          {view === AppView.CREATE && (
             <div className="max-w-2xl mx-auto pt-2 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">New Item</h2>
                  <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 bg-slate-800 rounded-full text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleCreate} className="space-y-6">
                   <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-400 ml-1">Type</label>
                      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                        {(['login', 'contact', 'wifi', 'card', 'note'] as const).map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setNewSecretCategory(cat);
                              // Reset analysis when switching types
                              setAiAnalysis(null);
                            }}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all whitespace-nowrap ${newSecretCategory === cat ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-slate-900/50 border-white/10 text-slate-400'}`}
                          >
                            {getCategoryIcon(cat)}
                            <span className="capitalize">{cat}</span>
                          </button>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-4 bg-slate-900/40 border border-white/5 p-5 rounded-3xl">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                          {formConfig.label}
                        </label>
                        <input 
                          className="w-full bg-transparent border-b border-white/10 py-2 text-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                          placeholder={formConfig.labelPlaceholder}
                          value={newSecretLabel}
                          onChange={e => setNewSecretLabel(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                           {formConfig.user}
                        </label>
                        <input 
                          className="w-full bg-transparent border-b border-white/10 py-2 text-base text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                          placeholder={formConfig.userPlaceholder}
                          value={newSecretUsername}
                          onChange={e => setNewSecretUsername(e.target.value)}
                        />
                      </div>
                   </div>

                   <div className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                           {formConfig.value}
                        </label>
                        {showAiTools && (
                          <button 
                            type="button"
                            onClick={handleAiGenerate}
                            disabled={isGenerating}
                            className="text-xs flex items-center gap-1 text-brand-400 font-medium"
                          >
                            <Sparkles className="w-3 h-3" />
                            {isGenerating ? 'Generating...' : 'AI Generate'}
                          </button>
                        )}
                      </div>
                      <textarea 
                        className="w-full bg-slate-950/50 rounded-xl p-4 text-white font-mono text-sm border border-white/5 focus:border-brand-500/50 focus:outline-none min-h-[100px]"
                        placeholder={formConfig.valuePlaceholder}
                        value={newSecretValue}
                        onChange={e => {
                          setNewSecretValue(e.target.value);
                          if(e.target.value.length > 5 && showAiTools) handleAiAnalyze(e.target.value);
                        }}
                      />
                      {aiAnalysis && showAiTools && (
                        <div className="flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                           <div className={`h-full w-1 rounded-full ${aiAnalysis.score > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                           <div className="text-xs text-slate-400">
                              <span className={`font-bold ${aiAnalysis.score > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                Score: {aiAnalysis.score}
                              </span>
                              <p className="mt-1">{aiAnalysis.feedback[0]}</p>
                           </div>
                        </div>
                      )}
                   </div>

                   <button 
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-brand-500/20 active:scale-95 transition-transform"
                   >
                     Save to Vault
                   </button>
                </form>
             </div>
          )}

          {/* VIEW: IMPORT */}
          {view === AppView.IMPORT && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
               <ImportView onComplete={() => setView(AppView.DASHBOARD)} />
            </div>
          )}

          {/* VIEW: SHARED LINK */}
          {view === AppView.SHARED_LINK && receivedSecret && (
             <SharedSecretDisplay secret={receivedSecret} setView={setView} />
          )}

        </div>

        {/* Mobile Bottom Navigation (Hide in Shared Link View) */}
        {view !== AppView.SHARED_LINK && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 px-6 flex items-center justify-between z-30 pb-2">
              <NavIcon 
                 icon={<Home className="w-6 h-6" />} 
                 label="Vault" 
                 active={view === AppView.DASHBOARD}
                 onClick={() => setView(AppView.DASHBOARD)}
              />
              <div className="-mt-8">
                 <button 
                   onClick={() => setView(AppView.CREATE)}
                   className="w-14 h-14 bg-gradient-to-tr from-brand-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/40 text-white active:scale-95 transition-transform"
                 >
                   <Plus className="w-7 h-7" />
                 </button>
              </div>
              <NavIcon 
                 icon={<Import className="w-6 h-6" />} 
                 label="Import" 
                 active={view === AppView.IMPORT}
                 onClick={() => setView(AppView.IMPORT)}
              />
          </div>
        )}

      </main>

      {/* Ephemeral Share Modal Overlay */}
      {shareSecret && (
        <ShareModal secret={shareSecret} onClose={() => setShareSecret(null)} />
      )}
    </div>
  );
}

const SharedSecretDisplay = ({ secret, setView }: { secret: Secret, setView: (v: AppView) => void }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(secret.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadVCard = () => {
    const vCardData = generateVCard(secret);
    const blob = new Blob([vCardData], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${secret.label.replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleSaveToVault = () => {
    // Check if vault is locked? Ideally prompt for auth if locked, but for now allow add to local storage.
    saveSecret({ ...secret, id: crypto.randomUUID(), createdAt: Date.now() });
    setView(AppView.DASHBOARD);
  };

  const isContact = secret.category === 'contact';

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
        
        {/* Glow effect */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
           <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 ring-4 ring-slate-800 shadow-xl">
              {isContact ? <User className="w-10 h-10 text-white" /> : <Shield className="w-10 h-10 text-brand-500" />}
           </div>
           
           <h2 className="text-2xl font-bold text-white mb-1">
             {isContact ? secret.label : 'Shared Secret'}
           </h2>
           <p className="text-slate-400 text-sm mb-8">
             {isContact ? 'Contact Card Received' : 'Securely shared via WhisperVault'}
           </p>

           {isContact ? (
             <div className="w-full space-y-4">
               <button 
                 onClick={handleDownloadVCard}
                 className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
               >
                 <Download className="w-5 h-5" />
                 Add to Contacts
               </button>
             </div>
           ) : (
             <div className="w-full space-y-4">
                <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                   <p className="text-sm text-slate-500 mb-1 font-medium uppercase tracking-wider">{secret.label}</p>
                   <code className="text-lg text-white font-mono break-all">{secret.value}</code>
                </div>
                <button 
                  onClick={handleCopy}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Copied to Clipboard' : 'Copy Secret'}
                </button>
             </div>
           )}
           
           <div className="mt-8 pt-8 border-t border-white/5 w-full">
              <button 
                onClick={handleSaveToVault}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
              >
                Save to My Vault
              </button>
              <button 
                onClick={() => setView(AppView.DASHBOARD)}
                className="mt-4 text-slate-500 hover:text-white text-sm"
              >
                Go to Dashboard
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components for cleanliness

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
      active 
      ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-inner' 
      : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]"></div>}
  </button>
);

const NavIcon = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 transition-colors ${
      active ? 'text-brand-400' : 'text-slate-500'
    }`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const SecretCard = ({ secret, showValue, onToggleValue, onShare, onDelete }: any) => {
  const isTextType = secret.category === 'note' || secret.category === 'contact';
  
  return (
    <div className="group relative bg-slate-900/60 backdrop-blur-md border border-white/5 hover:border-brand-500/30 rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5 active:scale-[0.99]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
           <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-300 shrink-0 border border-white/5">
              {secret.category === 'wifi' && <Wifi className="w-6 h-6" />}
              {secret.category === 'login' && <Key className="w-6 h-6" />}
              {secret.category === 'card' && <CreditCard className="w-6 h-6" />}
              {secret.category === 'note' && <FileText className="w-6 h-6" />}
              {secret.category === 'contact' && <User className="w-6 h-6" />}
           </div>
           <div className="min-w-0">
             <h3 className="font-semibold text-white truncate text-base">{secret.label}</h3>
             <p className="text-slate-500 text-xs truncate font-mono">{secret.username || (secret.category === 'contact' ? 'No contact info' : '********')}</p>
           </div>
        </div>
        <div className="flex items-center gap-1">
           <button onClick={onToggleValue} className="p-2 text-slate-400 hover:text-white transition-colors">
              {showValue ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
           </button>
           <button onClick={onShare} className="p-2 text-brand-500 hover:bg-brand-500/10 rounded-lg transition-colors">
              <Share2 className="w-5 h-5"/>
           </button>
        </div>
      </div>
      
      {/* Reveal Area */}
      {showValue && (
        <div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/5 flex items-start justify-between animate-in slide-in-from-top-2">
           <div className={`text-sm text-emerald-400 flex-1 mr-4 ${isTextType ? 'font-sans whitespace-pre-wrap' : 'font-mono break-all select-all'}`}>
              {secret.value}
           </div>
           <div className="flex gap-2 shrink-0">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ setView }: any) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-black">
        <Shield className="w-10 h-10 text-slate-700" />
      </div>
      <h3 className="text-xl font-bold text-white">Vault Locked</h3>
      <p className="text-slate-500 mt-2 max-w-xs leading-relaxed">Your secrets are secure. Start by adding your first key or importing data.</p>
      <button 
        onClick={() => setView(AppView.CREATE)}
        className="mt-8 px-8 py-3 bg-white text-slate-950 rounded-xl font-bold hover:bg-slate-200 transition-colors"
      >
        Create Secret
      </button>
  </div>
);

export default App;
