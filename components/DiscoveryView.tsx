
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { storage } from '../services/storageService';
import { GoogleGenAI } from "@google/genai";

interface GlobalArtist {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  url: string;
}

const DiscoveryView: React.FC<{ currentUser: User, onArtistClick: (id: string) => void }> = ({ currentUser, onArtistClick }) => {
  const [localArtists, setLocalArtists] = useState<User[]>([]);
  const [globalMesh, setGlobalMesh] = useState<GlobalArtist[]>([]);
  const [search, setSearch] = useState('');
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [nearbyInspo, setNearbyInspo] = useState<string | null>(null);
  const [groundingLinks, setGroundingLinks] = useState<{title: string, uri: string}[]>([]);
  const [globalGroundingLinks, setGlobalGroundingLinks] = useState<{title: string, uri: string}[]>([]);

  useEffect(() => {
    // Live update artist mesh from GunDB
    const initialArtists = storage.getAllArtists();
    setLocalArtists(initialArtists.filter(a => a.id !== currentUser.id));

    storage.getAllArtists((users) => {
      setLocalArtists(users.filter(a => a.id !== currentUser.id));
    });
    
    fetchGlobalMesh();
  }, [currentUser.id]);

  const fetchGlobalMesh = async () => {
    setLoadingGlobal(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Find 5 currently trending digital artists or creative projects happening globally right now. Return their names, what they do, and a brief 1-sentence bio. Focus on real-world news from the last month.",
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || "";
      // Extract search grounding URLs as per Gemini API guidelines
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const links = chunks.filter((c: any) => c.web).map((c: any) => ({
        title: c.web.title,
        uri: c.web.uri
      }));
      setGlobalGroundingLinks(links);

      const artists: GlobalArtist[] = [];
      const lines = text.split('\n').filter(l => l.length > 5);
      for(let i=0; i < Math.min(lines.length, 5); i++) {
        const namePart = lines[i].split(':')[0]?.replace(/^\d+\.\s*/, '').trim() || 'Global Artist';
        artists.push({
          name: namePart,
          role: 'External Node',
          bio: lines[i].split(':')[1] || 'Capturing the global creative pulse.',
          avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${namePart}`,
          url: '#'
        });
      }
      setGlobalMesh(artists);
    } catch (e) {
      console.error("Global Mesh Error", e);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const getNearbyInspiration = async () => {
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: "List specific art galleries, street art locations, or creative hubs near these coordinates.",
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
        // Extract Maps grounding URLs as per Gemini API guidelines
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const links = chunks.filter((c: any) => c.maps).map((c: any) => ({
          title: c.maps.title,
          uri: c.maps.uri
        }));
        setNearbyInspo(response.text || "The world is your canvas.");
        setGroundingLinks(links);
      });
    } catch (e) {}
  };

  const filteredLocal = localArtists.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 animate-fade-in pb-32">
      <header className="mb-12">
        <div className="bg-[var(--accent)] text-white p-4 chunky-card !shadow-none !border-0 rotate-[1deg] inline-block mb-3">
           <h2 className="text-3xl md:text-5xl font-display uppercase tracking-tight">Mesh_Discovery.</h2>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 mb-8">Universal Identity Sync</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="chunky-card p-6 rounded-[2.5rem] bg-[var(--input-bg)]/30 border-dashed">
            <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-4">Local Resonance</h4>
            <button onClick={getNearbyInspiration} className="chunky-button px-6 py-2 rounded-xl text-[9px]">Scan Surroundings</button>
            {nearbyInspo && (
              <div className="mt-4 text-xs italic opacity-80 bg-white/50 p-4 rounded-2xl">
                {nearbyInspo}
                <div className="mt-4 flex flex-wrap gap-2">
                  {groundingLinks.map((l, i) => (
                    <a key={i} href={l.uri} target="_blank" rel="noopener noreferrer" className="sticker !bg-[var(--primary)] text-white">📍 {l.title}</a>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="chunky-card p-6 rounded-[2.5rem] bg-[var(--primary)] text-white">
            <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Global Mesh Connectivity</h4>
            <p className="text-xs font-medium mb-4">Live peer-to-peer artist registry.</p>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white animate-[pulse_2s_infinite] w-[70%]"></div>
            </div>
          </div>
        </div>

        <input 
          type="text" 
          placeholder="Scan frequencies for global artists..." 
          className="w-full retro-input !py-4 text-sm font-medium"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </header>

      <section className="mb-20">
        <h3 className="font-display text-xl uppercase mb-8 opacity-40">External Nodes (Global Trending)</h3>
        {/* Added list of grounding URLs for the search tool as per guidelines */}
        {globalGroundingLinks.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {globalGroundingLinks.map((l, i) => (
              <a key={i} href={l.uri} target="_blank" rel="noopener noreferrer" className="sticker !bg-[var(--accent)] text-white text-[8px]">🔗 {l.title}</a>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {loadingGlobal ? (
            <div className="col-span-full py-20 text-center animate-pulse uppercase font-bold tracking-widest opacity-20">Syncing with Global Satellites...</div>
          ) : (
            globalMesh.map((artist, idx) => (
              <div key={idx} className="chunky-card rounded-[2.5rem] p-8 hover:-translate-y-2 transition-all bg-[var(--card-bg)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <div className="sticker !rotate-12 !bg-amber-400">GLOBAL</div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-[2rem] border-2 border-[var(--border)] overflow-hidden bg-white mb-6">
                    <img src={artist.avatar} alt="" />
                  </div>
                  <h4 className="font-heading text-lg uppercase mb-1">{artist.name}</h4>
                  <p className="text-[9px] font-bold opacity-40 uppercase mb-4 tracking-widest">{artist.role}</p>
                  <p className="text-xs italic opacity-60 mb-8 line-clamp-3">"{artist.bio}"</p>
                  <button className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white text-[9px] font-bold uppercase tracking-widest shadow-md">Sync Node</button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="font-display text-xl uppercase mb-8 opacity-40">Global Pulse Members</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredLocal.map(artist => (
            <div key={artist.id} className="chunky-card rounded-[2.5rem] p-6 hover:-translate-y-1 transition-transform bg-[var(--card-bg)] text-center">
              <img src={artist.avatar} className="w-16 h-16 rounded-[1.5rem] border-2 border-[var(--border)] mx-auto mb-4 bg-white" alt="" />
              <h4 className="font-heading text-sm uppercase truncate">{artist.name}</h4>
              <p className="text-[8px] font-bold opacity-30 uppercase mb-4 tracking-widest">{artist.role}</p>
              <button onClick={() => onArtistClick(artist.id)} className="text-[9px] font-bold uppercase underline tracking-widest hover:text-[var(--primary)]">View Studio</button>
            </div>
          ))}
          {filteredLocal.length === 0 && (
            <p className="col-span-full py-20 text-center opacity-30 italic uppercase text-xs">Waiting for artists to sync to the mesh...</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default DiscoveryView;
