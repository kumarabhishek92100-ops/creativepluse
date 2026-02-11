
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storageService';
import { User } from '../types';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [knownIdentities, setKnownIdentities] = useState<User[]>([]);

  useEffect(() => {
    // Detect all identities currently registered on this node
    const all = storage.getAllArtists();
    setKnownIdentities(all);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alias || !password) return;
    setLoading(true);
    setError('');

    try {
      const result = isLogin 
        ? await storage.login(alias, password)
        : await storage.createAccount(alias, password);

      if (result.error) {
        setError(result.error);
      } else if (result.user) {
        onAuthSuccess(result.user);
      }
    } catch (err) {
      setError("An error occurred during verification.");
    } finally {
      setLoading(false);
    }
  };

  const selectIdentity = (user: User) => {
    setAlias(user.name);
    setIsLogin(true);
    // Focus password field if possible, or just visually signal
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-base)]">
      <div className="chunky-card max-w-sm w-full p-10 rounded-[3.5rem] animate-fade-in text-center shadow-2xl">
        <div className="bg-[var(--primary)] text-white p-6 chunky-card !shadow-none !border-0 rotate-[-2deg] mb-8 inline-block">
          <h1 className="text-3xl font-display leading-none">PULSE</h1>
        </div>
        
        <h2 className="text-xl font-heading uppercase mb-2">{isLogin ? 'Artist Login' : 'Create Identity'}</h2>
        <p className="text-[10px] mb-8 opacity-40 uppercase tracking-widest font-bold">Encrypted Studio Node</p>

        {/* Quick Switch Gallery */}
        {isLogin && knownIdentities.length > 0 && (
          <div className="mb-8 border-b border-[var(--border)] border-dashed pb-8">
            <p className="text-[8px] font-bold uppercase opacity-30 mb-4 tracking-widest">Known Identities on this Node</p>
            <div className="flex overflow-x-auto gap-4 px-2 no-scrollbar justify-center">
              {knownIdentities.map(identity => (
                <button 
                  key={identity.id}
                  onClick={() => selectIdentity(identity)}
                  className={`flex-shrink-0 group transition-all ${alias.toLowerCase() === identity.name.toLowerCase() ? 'scale-110' : 'opacity-40 hover:opacity-100 scale-90'}`}
                >
                  <div className={`w-14 h-14 rounded-full border-2 overflow-hidden bg-white mb-2 transition-all ${alias.toLowerCase() === identity.name.toLowerCase() ? 'border-[var(--primary)] shadow-lg rotate-0' : 'border-[var(--border)] rotate-3'}`}>
                    <img src={identity.avatar} className="w-full h-full object-cover" alt="" />
                  </div>
                  <p className="text-[7px] font-bold uppercase tracking-tighter truncate max-w-[56px]">{identity.name}</p>
                </button>
              ))}
              <button 
                onClick={() => { setAlias(''); setIsLogin(false); }}
                className="flex-shrink-0 group opacity-40 hover:opacity-100 scale-90"
              >
                <div className="w-14 h-14 rounded-full border-2 border-[var(--border)] border-dashed bg-transparent mb-2 flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </div>
                <p className="text-[7px] font-bold uppercase tracking-tighter">New</p>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="text-[9px] font-bold uppercase opacity-40 ml-2 mb-1 block">Your Alias</label>
            <input 
              type="text" 
              className="w-full retro-input text-center" 
              placeholder="e.g. Pixel_Drift" 
              value={alias}
              onChange={e => setAlias(e.target.value)}
              required
            />
          </div>

          <div className="text-left">
            <label className="text-[9px] font-bold uppercase opacity-40 ml-2 mb-1 block">Private Key (Pass)</label>
            <input 
              type="password" 
              className="w-full retro-input text-center" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus={alias !== ''}
            />
          </div>

          {error && <p className="text-[9px] text-red-500 font-bold uppercase bg-red-50 py-2 rounded-lg">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full chunky-button py-4 rounded-2xl mt-4 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isLogin ? 'Enter Workspace' : 'Manifest Account'}
          </button>
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="mt-8 text-[9px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
        >
          {isLogin ? "No account? Create identity" : "Existing artist? Identity Login"}
        </button>

        <div className="mt-10 pt-6 border-t border-[var(--border)] border-dashed">
          <p className="text-[7px] font-bold opacity-30 uppercase tracking-[0.4em] italic leading-relaxed">
            Local Security Active<br/>
            Zero Network Leakage Verified
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
