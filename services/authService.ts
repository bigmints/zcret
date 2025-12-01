
const AUTH_KEY = 'whispervault_auth';

interface AuthData {
  pinHash: string;
  recoveryPhrase: string; // In a real production app, this should also be hashed/encrypted
  salt: string;
}

// Dictionary for friendly recovery phrases
const WORDS = [
  'pixel', 'vault', 'cyber', 'neon', 'shield', 'crypto', 
  'laser', 'orbit', 'quantum', 'flux', 'sonic', 'hyper',
  'radar', 'solar', 'lunar', 'atlas', 'vector', 'matrix'
];

export const generateRecoveryPhrase = (): string => {
  const phrase = [];
  for (let i = 0; i < 4; i++) {
    const index = Math.floor(Math.random() * WORDS.length);
    phrase.push(WORDS[index]);
  }
  return phrase.join(' ');
};

const hashPin = async (pin: string, salt: string): Promise<string> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(pin + salt),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  // Use PBKDF2 for better security than simple SHA
  // Note: For this demo, we are doing a simplified hash
  const data = enc.encode(pin + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const hasAuth = (): boolean => {
  return !!localStorage.getItem(AUTH_KEY);
};

export const setupAuth = async (pin: string): Promise<string> => {
  const salt = crypto.randomUUID();
  const pinHash = await hashPin(pin, salt);
  const recoveryPhrase = generateRecoveryPhrase();
  
  const authData: AuthData = {
    pinHash,
    recoveryPhrase,
    salt
  };
  
  localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
  return recoveryPhrase;
};

export const verifyPin = async (pin: string): Promise<boolean> => {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return false;
  
  const authData: AuthData = JSON.parse(stored);
  const attemptHash = await hashPin(pin, authData.salt);
  
  return attemptHash === authData.pinHash;
};

export const verifyRecoveryPhrase = (phrase: string): boolean => {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return false;
  
  const authData: AuthData = JSON.parse(stored);
  return authData.recoveryPhrase.toLowerCase().trim() === phrase.toLowerCase().trim();
};

export const resetAuth = () => {
  localStorage.removeItem(AUTH_KEY);
};

export const wipeVault = () => {
  localStorage.clear();
  window.location.reload();
};
