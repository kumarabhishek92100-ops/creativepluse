
import React, { useState, useEffect } from 'react';
import { Post, User } from '../types';
import { storage } from '../services/storageService';

interface ManifestoViewProps {
  currentUser: User;
}

const ManifestoView: React.FC<ManifestoViewProps> = ({ currentUser }) => {
  const [manifestations, setManifestations] = useState<Post[]>([]);

  useEffect(() => {
    const all = storage.getGlobalFeed();
    const goals = all.filter(p => p.type === 'target' && p.author.id === currentUser.id);
    setManifestations(goals.sort((a, b) => new Date(a.deadline || '').getTime() - new Date(b.deadline || '').getTime()));
  }, [currentUser.id]);

  const calculateProgress = (post: Post) => {
    if (!post.deadline) return 0;
    const start = new Date(post.createdAt).getTime();
    const end = new Date(post.deadline).getTime();
    const now = Date.now();
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  };

  return (
    <div className="max-w-4xl mx-auto py-12 md:py-20 px-6 animate-fade-in">
      <header className="mb-16">
        <div className="bg-[var(--secondary)] text-white p-4 chunky-card !shadow-none !border-0 rotate-[-1deg] inline-block mb-3">
           <h2 className="text-3xl md:text-5xl font-display leading-none uppercase tracking-tight">Manifesto.</h2>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30">Your Creative Ambition Timeline</p>
      </header>

      {manifestations.length === 0 ? (
        <div className="py-32 text-center opacity-20 italic space-y-6">
           <div className="text-6xl">✨</div>
           <p className="text-xl font-display uppercase tracking-tight">The board is clear. Manifest your first goal.</p>
        </div>
      ) : (
        <div className="space-y-12 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-1 before:bg-[var(--border)] before:opacity-10">
          {manifestations.map((goal, idx) => {
            const p = calculateProgress(goal);
            return (
              <div key={goal.id} className="relative pl-24 group">
                 {/* Dot */}
                 <div className={`absolute left-[30px] top-6 w-5 h-5 rounded-full border-4 border-white shadow-lg transition-transform group-hover:scale-125 z-10 ${p >= 100 ? 'bg-green-500' : 'bg-[var(--secondary)]'}`}></div>
                 
                 <div className="chunky-card rounded-[3rem] p-8 md:p-12 hover:-translate-y-1 transition-all bg-[var(--card-bg)]">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                       <div>
                          <h3 className="text-2xl font-display uppercase italic tracking-tighter mb-2">{goal.caption}</h3>
                          <div className="flex gap-3">
                             <div className="sticker !bg-[var(--input-bg)] !text-[var(--text-muted)]">Target: {new Date(goal.deadline || '').toLocaleDateString()}</div>
                             {p >= 100 && <div className="sticker !bg-green-100 !text-green-700">MANIFESTED</div>}
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-4xl font-display opacity-10 leading-none">#{idx + 1}</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">
                          <span>Pulse Realization</span>
                          <span>{p}%</span>
                       </div>
                       <div className="w-full h-8 bg-[var(--input-bg)] border-2 border-[var(--border)] rounded-[2rem] overflow-hidden p-1 shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${p >= 100 ? 'bg-green-500' : 'bg-[var(--secondary)]'}`} 
                            style={{width: `${p}%`}}
                          ></div>
                       </div>
                       <div className="flex justify-between items-center pt-4">
                          <p className="text-[8px] font-bold uppercase tracking-widest opacity-30">Manifested on {new Date(goal.createdAt).toLocaleDateString()}</p>
                          <button className="text-[9px] font-bold uppercase underline tracking-widest hover:text-[var(--primary)] transition-colors">Resonate Pulse</button>
                       </div>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Hub */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="chunky-card p-8 rounded-[2.5rem] bg-[var(--primary)] text-white">
            <h4 className="text-[10px] font-bold uppercase mb-2">Active Aims</h4>
            <p className="text-4xl font-display">{manifestations.filter(m => calculateProgress(m) < 100).length}</p>
         </div>
         <div className="chunky-card p-8 rounded-[2.5rem] bg-[var(--accent)] text-white">
            <h4 className="text-[10px] font-bold uppercase mb-2">Completed Pulses</h4>
            <p className="text-4xl font-display">{manifestations.filter(m => calculateProgress(m) >= 100).length}</p>
         </div>
         <div className="chunky-card p-8 rounded-[2.5rem] bg-[var(--secondary)] text-white">
            <h4 className="text-[10px] font-bold uppercase mb-2">Manifestations Score</h4>
            <p className="text-4xl font-display">
               {manifestations.length > 0 ? Math.round(manifestations.reduce((acc, m) => acc + calculateProgress(m), 0) / manifestations.length) : 0}%
            </p>
         </div>
      </div>
    </div>
  );
};

export default ManifestoView;
