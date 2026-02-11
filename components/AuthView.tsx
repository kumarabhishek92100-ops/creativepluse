
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
    storage.getAllArtists((all) => {
      setKnownIdentities(all.slice(0, 5));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alias.trim() || !password.trim()) {
      setError("Alias and Private Key are required.");
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const result = isLogin 
        ? await storage.login(alias.trim(), password.trim())
        : await storage.createAccount(alias.trim(), password.trim());

      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else if (result.user) {
        onAuthSuccess(result.user);
      }
    } catch (err) {
      setError("Authentication failed. Check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-base)]">
      <div className="chunky-card max-w-sm w-full p-10 rounded-[3.5rem] animate-fade-in text-center shadow-2xl bg-white">
        <div className="bg-[var(--primary)] text-white p-6 chunky-card !shadow-none !border-0 rotate-[-2deg] mb-8 inline-block">
          <h1 className="text-3xl font-display leading-none tracking-tight">PULSE</h1>
        </div>
        
        <h2 className="text-xl font-heading uppercase mb-2">{isLogin ? 'Enter Mesh' : 'Claim Identity'}</h2>
        <p className="text-[10px] mb-8 opacity-40 uppercase tracking-widest font-bold italic">Global Decentralized Sync</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="text-[9px] font-bold uppercase opacity-40 ml-2 mb-1 block">Global Alias</label>
            <input 
              type="text" 
              className="w-full retro-input text-center font-bold" 
              placeholder="e.g. Pixel_Drift" 
              value={alias}
              autoComplete="username"
              onChange={e => setAlias(e.target.value)}
              required
            />
          </div>

          <div className="text-left">
            <label className="text-[9px] font-bold uppercase opacity-40 ml-2 mb-1 block">Private Key</label>
            <input 
              type="password" 
              className="w-full retro-input text-center" 
              placeholder="••••••••" 
              value={password}
              autoComplete="current-password"
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="animate-shake">
              <p className="text-[9px] text-red-500 font-bold uppercase bg-red-50 py-2 rounded-lg border border-red-100">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full chunky-button py-4 rounded-2xl mt-4 transition-all ${loading ? 'opacity-70 scale-95' : 'hover:-translate-y-1'}`}
          >
            {loading ? 'Resonating...' : isLogin ? 'Access Studio' : 'Manifest Identity'}
          </button>
        </form>

        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="mt-8 text-[9px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
        >
          {isLogin ? "New artist? Claim identity" : "Existing artist? Sync here"}
        </button>

        <div className="mt-10 pt-6 border-t border-[var(--border)] border-dashed">
          <p className="text-[7px] font-bold opacity-30 uppercase tracking-[0.4em] italic leading-relaxed">
            Universal P2P Infrastructure<br/>
            Serverless & Secure
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
