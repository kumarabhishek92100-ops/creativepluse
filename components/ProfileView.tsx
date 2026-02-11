
import React, { useState, useEffect, useRef } from 'react';
import { User, Post, AvatarConfig } from '../types';
import { storage, getAvatarUrl } from '../services/storageService';
import AvatarEditor from './AvatarEditor';
import PostCard from './PostCard';

interface ProfileViewProps {
  userId: string;
  isOwn: boolean;
  onClose?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ userId, isOwn, onClose }) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    if (isOwn) {
      const u = storage.getUser();
      setProfile(u);
      if (u) {
        setPosts(storage.getPosts(u.id));
      }
      setLoading(false);
    } else {
      // Fetch user profile and posts from the Universal Mesh
      storage.getGlobalFeed((allPosts) => {
        const filteredPosts = allPosts.filter(p => p.author.id === userId);
        setPosts(filteredPosts);
        if (allPosts.length > 0) {
          const found = allPosts.find(p => p.author.id === userId);
          if (found) setProfile(found.author);
        }
        setLoading(false);
      });
    }
  }, [userId, isOwn]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (storage.importWorkspace(content)) {
        window.location.reload();
      } else {
        alert("Sync failed: Data corrupted.");
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateBio = (newBio: string) => {
    if (!profile) return;
    const updated = { ...profile, bio: newBio };
    setProfile(updated);
    if (isOwn) storage.saveUser(updated);
  };

  const handleSaveAvatar = (config: AvatarConfig) => {
    if (!profile) return;
    const newAvatar = getAvatarUrl(config, profile.id);
    const updated = { ...profile, avatar: newAvatar, avatarConfig: config };
    setProfile(updated);
    if (isOwn) storage.saveUser(updated);
    setShowEditor(false);
  };

  if (loading || !profile) return (
    <div className="p-32 flex flex-col items-center justify-center animate-pulse">
       <div className="w-12 h-12 bg-[var(--primary)] rounded-full mb-6"></div>
       <p className="font-display uppercase tracking-widest opacity-20">Syncing Universal Identity...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 pb-32">
      {onClose && (
        <button onClick={onClose} className="mb-8 flex items-center gap-2 text-[10px] font-bold uppercase opacity-40 hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
          Back to Global Stream
        </button>
      )}

      <div className="chunky-card p-10 rounded-[4rem] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-[var(--primary)] opacity-10"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative group">
            <div className="w-40 h-40 rounded-[3rem] border-4 border-white shadow-2xl overflow-hidden bg-white -rotate-3 group-hover:rotate-0 transition-transform">
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            </div>
            {isOwn && (
              <button 
                onClick={() => setShowEditor(true)}
                className="absolute -bottom-2 -right-2 w-12 h-12 bg-[var(--border)] text-white rounded-full flex items-center justify-center border-4 border-white shadow-xl hover:scale-110 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
            )}
          </div>

          <h2 className="mt-8 text-4xl font-display uppercase tracking-tight">{profile.name}</h2>
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--primary)] mt-2">{profile.role}</span>
          
          <div className="mt-6 max-w-md w-full">
            {isOwn ? (
              <textarea 
                className="w-full bg-transparent border-none text-center outline-none resize-none text-sm font-medium opacity-60 italic"
                placeholder="Write your creative manifesto..."
                defaultValue={profile.bio}
                onBlur={(e) => handleUpdateBio(e.target.value)}
              />
            ) : (
              <p className="text-sm italic opacity-70 font-medium">"{profile.bio || 'This artist has yet to manifest a manifesto.'}"</p>
            )}
          </div>

          {isOwn && (
            <div className="mt-8 flex flex-wrap justify-center gap-4">
               <button 
                onClick={() => storage.exportWorkspace()}
                className="px-6 py-3 rounded-2xl bg-[var(--accent)] text-white text-[9px] font-bold uppercase tracking-widest border-2 border-[var(--border)] shadow-md hover:-translate-y-1 transition-transform"
               >
                 Global Sync (Export)
               </button>
               <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-2xl bg-white text-[var(--border)] text-[9px] font-bold uppercase tracking-widest border-2 border-[var(--border)] shadow-md hover:-translate-y-1 transition-transform"
               >
                 Restore Identity
               </button>
               <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
            </div>
          )}

          <div className="mt-10 flex gap-12 border-t border-[var(--border)] pt-8 w-full justify-center">
            <div className="text-center">
              <p className="text-2xl font-display">{posts.length}</p>
              <p className="text-[8px] font-bold uppercase opacity-40">Mesh Drops</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-display">GLOBAL</p>
              <p className="text-[8px] font-bold uppercase opacity-40">Sync Level</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 space-y-12">
        <h3 className="font-display text-2xl uppercase italic tracking-tighter">Mesh Collection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map(p => (
            <PostCard key={p.id} post={p} onUpdate={() => {}} />
          ))}
          {posts.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-30 italic">No mesh drops detected from this frequency...</div>
          )}
        </div>
      </div>

      {showEditor && profile && (
        <AvatarEditor 
          user={profile} 
          onSave={handleSaveAvatar} 
          onClose={() => setShowEditor(false)} 
        />
      )}
    </div>
  );
};

export default ProfileView;
