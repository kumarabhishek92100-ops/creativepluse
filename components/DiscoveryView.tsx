
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { storage } from '../services/storageService';
import { GoogleGenAI } from "@google/genai";

const DiscoveryView: React.FC<{ currentUser: User, onArtistClick: (id: string) => void }> = ({ currentUser, onArtistClick }) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getAllArtists((users) => {
      setAllUsers(users.filter(u => u.name !== currentUser.name));
      setLoading(false);
    });
  }, [currentUser.name]);

  const handleFollow = async (handle: string) => {
    const friend = await storage.followUser(currentUser, handle);
    if (friend) alert(`Frequency aligned with @${handle}`);
  };

  const filtered = allUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 animate-fade-in pb-32">
      <header className="mb-12">
        <div className="bg-[var(--accent)] text-white p-4 chunky-card !shadow-none !border-0 rotate-[1deg] inline-block mb-3">
           <h2 className="text-3xl md:text-5xl font-display uppercase tracking-tight">Mesh_Directory.</h2>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 mb-8">Universal Identity Sync</p>
        
        <input 
          type="text" 
          placeholder="Search global handles..." 
          className="w-full retro-input !py-5 text-lg font-heading uppercase"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </header>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-2xl font-display uppercase opacity-20">Scanning frequencies...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filtered.map(artist => (
            <div key={artist.id} className="chunky-card rounded-[2.5rem] p-8 hover:-translate-y-2 transition-all bg-[var(--card-bg)] border-4 text-center group">
              <div className="w-24 h-24 rounded-[2rem] border-4 border-[var(--border)] mx-auto mb-6 bg-white overflow-hidden group-hover:rotate-6 transition-transform">
                <img src={artist.avatar} className="w-full h-full object-cover" alt="" />
              </div>
              <h4 className="font-heading text-lg uppercase mb-1 truncate">{artist.name}</h4>
              <p className="text-[9px] font-bold opacity-40 uppercase mb-6 tracking-widest">{artist.role}</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => onArtistClick(artist.id)}
                  className="text-[9px] font-bold uppercase underline tracking-widest hover:text-[var(--primary)]"
                >
                  View Studio
                </button>
                <button 
                  onClick={() => handleFollow(artist.name)}
                  className="chunky-button py-3 rounded-2xl text-[9px]"
                >
                  Align Pulse
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-20 text-center opacity-30 italic uppercase">No artists found in this sector.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DiscoveryView;
