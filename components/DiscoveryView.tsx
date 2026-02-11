
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { storage } from '../services/storageService';
import { GoogleGenAI } from "@google/genai";

interface DiscoveryViewProps {
  currentUser: User;
  onArtistClick: (id: string) => void;
}

const DiscoveryView: React.FC<DiscoveryViewProps> = ({ currentUser, onArtistClick }) => {
  const [artists, setArtists] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [nearbyInspo, setNearbyInspo] = useState<string | null>(null);
  const [loadingInspo, setLoadingInspo] = useState(false);

  useEffect(() => {
    setArtists(storage.getAllArtists().filter(a => a.id !== currentUser.id));
  }, [currentUser.id]);

  const filtered = artists.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  const handleFollow = (id: string) => {
    storage.toggleFollow(currentUser.id, id);
    setArtists(storage.getAllArtists().filter(a => a.id !== currentUser.id));
  };

  const getNearbyInspiration = async () => {
    setLoadingInspo(true);
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-lite-latest",
          contents: "What are some famous artistic landmarks or inspiring public spaces near these coordinates for a creative mood?",
          config: {
            tools: [{ googleMaps: {} }],
            toolConfig: {
              retrievalConfig: {
                latLng: {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude
                }
              }
            }
          },
        });
        setNearbyInspo(response.text || "Nature is your closest muse.");
        setLoadingInspo(false);
      }, () => {
        setNearbyInspo("Permission denied. Look within for inspiration.");
        setLoadingInspo(false);
      });
    } catch (e) {
      setLoadingInspo(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 md:py-20 px-6 animate-fade-in">
      <header className="mb-12">
        <div className="bg-[var(--accent)] text-white p-4 chunky-card !shadow-none !border-0 rotate-[1deg] inline-block mb-3">
           <h2 className="text-3xl md:text-5xl font-display leading-none uppercase tracking-tight">Artists.</h2>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 mb-8">Universal Identity Discovery</p>
        
        {/* Nearby Inspo Feature */}
        <div className="mb-12 p-6 chunky-card rounded-[2.5rem] bg-[var(--input-bg)]/30 border-dashed">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-60">Local Resonance</h4>
            <button 
              onClick={getNearbyInspiration} 
              disabled={loadingInspo}
              className="text-[9px] font-bold uppercase underline tracking-widest hover:text-[var(--primary)] transition-colors"
            >
              {loadingInspo ? 'Sensing Mesh...' : 'Find Inspiration Nearby'}
            </button>
          </div>
          {nearbyInspo && (
            <div className="text-xs italic leading-relaxed opacity-80 animate-fade-in bg-white/50 p-4 rounded-2xl">
              {nearbyInspo}
            </div>
          )}
        </div>

        <input 
          type="text" 
          placeholder="Scan frequencies for artists..." 
          className="w-full retro-input !py-4 text-sm font-medium"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(artist => {
          const isFollowing = currentUser.following?.includes(artist.id);
          return (
            <div key={artist.id} className="chunky-card rounded-[2.5rem] p-6 hover:-translate-y-1 transition-transform group bg-[var(--card-bg)]">
              <div className="flex flex-col items-center text-center">
                <button onClick={() => onArtistClick(artist.id)} className="relative mb-4 group">
                  <div className="w-24 h-24 rounded-[2rem] border-2 border-[var(--border)] overflow-hidden bg-white group-hover:rotate-3 transition-transform">
                    <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover" />
                  </div>
                </button>
                <h3 className="font-heading text-lg uppercase tracking-tight">{artist.name}</h3>
                <p className="text-[9px] font-bold opacity-40 uppercase mb-4 tracking-widest">{artist.role}</p>
                <p className="text-xs italic opacity-60 line-clamp-2 h-8 mb-6">"{artist.bio || 'Broadcast silent.'}"</p>
                
                <button 
                  onClick={() => handleFollow(artist.id)}
                  className={`w-full py-2.5 rounded-2xl text-[9px] font-bold uppercase tracking-widest border-2 border-[var(--border)] transition-all ${isFollowing ? 'bg-transparent opacity-40' : 'bg-[var(--primary)] text-white shadow-md active:scale-95'}`}
                >
                  {isFollowing ? 'Connected' : 'Sync Identity'}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-20 italic">
            No universal identities found in this spectrum.
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoveryView;
