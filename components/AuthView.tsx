
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
    // Detect all identities currently registered on the global mesh via the local node cache
    storage.getAllArtists((all) => {
      setKnownIdentities(all.slice(0, 5)); // Just show a few for the welcome screen
    });
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
      setError("Pulse verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-base)]">
      <div className="chunky-card max-w-sm w-full p-10 rounded-[3.5rem] animate-fade-in text-center shadow-2xl">
        <div className="bg-[var(--primary)] text-white p-6 chunky-card !shadow-none !border-0 rotate-[-2deg] mb-8 inline-block">
          <h1 className="text-3xl font-display leading-none tracking-tight">PULSE</h1>
        </div>
        
        <h2 className="text-xl font-heading uppercase mb-2">{isLogin ? 'Enter Mesh' : 'Claim Identity'}</h2>
        <p className="text-[10px] mb-8 opacity-40 uppercase tracking-widest font-bold italic">Decentralized Studio Sync</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="text-[9px] font-bold uppercase opacity-40 ml-2 mb-1 block">Global Alias</label>
            <input 
              type="text" 
              className="w-full retro-input text-center font-bold" 
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
            />
          </div>

          {error && <p className="text-[9px] text-red-500 font-bold uppercase bg-red-50 py-2 rounded-lg">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full chunky-button py-4 rounded-2xl mt-4 disabled:opacity-50"
          >
            {loading ? 'Verifying Pulse...' : isLogin ? 'Access Studio' : 'Manifest Identity'}
          </button>
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="mt-8 text-[9px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
        >
          {isLogin ? "No identity? Claim one" : "Existing artist? Sync here"}
        </button>

        <div className="mt-10 pt-6 border-t border-[var(--border)] border-dashed">
          <p className="text-[7px] font-bold opacity-30 uppercase tracking-[0.4em] italic leading-relaxed">
            Zero Server Infrastructure<br/>
            End-to-End Mesh Security
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
