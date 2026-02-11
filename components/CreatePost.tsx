
import React, { useState, useRef } from 'react';
import { PostType, PostVisibility } from '../types';
import { generateCreativeImage, generateArtPrompt } from '../services/geminiService';

interface CreatePostProps {
  onPublish: (post: { 
    type: PostType; 
    visibility: PostVisibility;
    imageUrl?: string; 
    videoUrl?: string; 
    audioUrl?: string; 
    caption: string; 
    deadline?: string 
  }) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPublish }) => {
  const [activeType, setActiveType] = useState<PostType>('photo');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [caption, setCaption] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [theme, setTheme] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Auto-detect type
    if (file.type.startsWith('image/')) setActiveType('photo');
    else if (file.type.startsWith('video/')) setActiveType('video');
    else if (file.type.startsWith('audio/')) setActiveType('audio');

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!theme) return;
    setLoading(true);
    try {
      const prompt = await generateArtPrompt(theme);
      const imageUrl = await generateCreativeImage(prompt || theme);
      if (imageUrl) {
        setMediaPreview(imageUrl);
        setActiveType('photo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = () => {
    if (activeType !== 'text' && !mediaPreview && activeType !== 'target') {
      alert("Please upload or generate media!");
      return;
    }
    if (!caption && activeType !== 'target') {
      alert("Please write a manifesto!");
      return;
    }

    onPublish({
      type: activeType,
      visibility,
      imageUrl: activeType === 'photo' ? mediaPreview! : undefined,
      videoUrl: activeType === 'video' ? mediaPreview! : undefined,
      audioUrl: activeType === 'audio' ? mediaPreview! : undefined,
      caption,
      deadline: activeType === 'target' ? deadline : undefined
    });
  };

  const types: { id: PostType; label: string; icon: string }[] = [
    { id: 'photo', label: 'Photo', icon: '📸' },
    { id: 'video', label: 'Video', icon: '🎬' },
    { id: 'audio', label: 'Audio', icon: '🎙️' },
    { id: 'text', label: 'Text', icon: '✍️' },
    { id: 'target', label: 'Target', icon: '🗓️' },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-12 pb-32 animate-fade-in">
      <div className="bg-[var(--border)] text-[var(--self-text)] p-5 md:p-6 chunky-card !shadow-none !border-0 rotate-[1deg] mb-8 md:mb-12 inline-block">
         <h2 className="text-2xl md:text-4xl font-display tracking-tight leading-none uppercase italic">The Creator<br/>_Lab.</h2>
      </div>
      
      <div className="chunky-card p-6 md:p-10 rounded-[2.5rem] space-y-8 bg-[var(--card-bg)]">
        
        {/* Visibility Selector */}
        <div className="p-4 bg-[var(--input-bg)] rounded-3xl border-2 border-[var(--border)] border-dashed">
          <label className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-40 mb-3 block">Target Audience</label>
          <div className="flex gap-4">
             <button 
              onClick={() => setVisibility('public')}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${visibility === 'public' ? 'bg-[var(--primary)] text-white border-[var(--border)] shadow-md' : 'bg-white/50 border-transparent opacity-60'}`}
             >
                🌍 Broadcast Public
             </button>
             <button 
              onClick={() => setVisibility('following')}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${visibility === 'following' ? 'bg-[var(--secondary)] text-white border-[var(--border)] shadow-md' : 'bg-white/50 border-transparent opacity-60'}`}
             >
                🔒 Following Only
             </button>
          </div>
        </div>

        {/* Type Selector */}
        <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar">
          {types.map(t => (
            <button
              key={t.id}
              onClick={() => {
                setActiveType(t.id);
                setMediaPreview(null);
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl border-2 transition-all font-heading text-[10px] uppercase tracking-widest ${activeType === t.id ? 'bg-[var(--primary)] text-white border-[var(--border)] scale-105 shadow-md' : 'bg-[var(--input-bg)] border-transparent opacity-60'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Media Preview / Input Area */}
        <div className="relative group aspect-square rounded-[2rem] overflow-hidden border-2 border-[var(--border)] bg-[var(--input-bg)] flex flex-col items-center justify-center shadow-inner">
          {mediaPreview ? (
            <div className="w-full h-full relative">
              {activeType === 'photo' && <img src={mediaPreview} className="w-full h-full object-cover" alt="Preview" />}
              {activeType === 'video' && <video src={mediaPreview} className="w-full h-full object-cover" controls />}
              {activeType === 'audio' && (
                <div className="w-full h-full flex items-center justify-center p-8 bg-[var(--accent)]/10">
                  <audio src={mediaPreview} controls className="w-full" />
                </div>
              )}
              <button 
                onClick={() => setMediaPreview(null)}
                className="absolute top-4 right-4 chunky-button bg-[var(--secondary)] p-2 rounded-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          ) : (
            <div className="text-center p-8 space-y-6">
              {activeType === 'photo' && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="chunky-button px-8 py-3 rounded-2xl">Upload from Gallery</button>
                    <div className="flex items-center gap-4 py-2">
                      <div className="h-[1px] flex-1 bg-[var(--border)] opacity-20"></div>
                      <span className="text-[10px] font-bold opacity-30">OR AI GEN</span>
                      <div className="h-[1px] flex-1 bg-[var(--border)] opacity-20"></div>
                    </div>
                    <input 
                      type="text" 
                      placeholder="AI Art Concept..." 
                      className="retro-input text-sm"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                    />
                    <button onClick={handleGenerate} disabled={loading} className="text-[10px] font-bold uppercase underline tracking-widest opacity-60 hover:opacity-100 disabled:opacity-30">
                      {loading ? 'MANIFESTING...' : 'INITIATE GENERATION'}
                    </button>
                  </div>
                </div>
              )}
              
              {(activeType === 'video' || activeType === 'audio') && (
                <button onClick={() => fileInputRef.current?.click()} className="chunky-button px-8 py-4 rounded-2xl">
                  Choose {activeType} File
                </button>
              )}

              {activeType === 'text' && (
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">Broadcasting text only...</p>
              )}

              {activeType === 'target' && (
                <div className="w-full space-y-4 px-6">
                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Select Manifestation Date</p>
                   <input 
                    type="date" 
                    className="retro-input w-full"
                    onChange={(e) => setDeadline(e.target.value)}
                   />
                </div>
              )}

              {!['photo', 'video', 'audio', 'target'].includes(activeType) && activeType !== 'text' && (
                <div className="w-20 h-20 bg-white border-2 border-[var(--border)] rounded-full flex items-center justify-center mx-auto opacity-20">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                </div>
              )}
            </div>
          )}
          <input type="file" ref={fileInputRef} hidden accept={activeType === 'photo' ? 'image/*' : activeType === 'video' ? 'video/*' : 'audio/*'} onChange={handleFileChange} />
        </div>

        {/* Caption Area */}
        <div className="space-y-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">
            {activeType === 'target' ? 'The Motive' : 'The Manifesto'}
          </label>
          <textarea 
            rows={activeType === 'text' ? 6 : 3} 
            placeholder={activeType === 'target' ? "What is the goal for this date?" : "Share the story behind this drop..."} 
            className="w-full retro-input text-sm"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        <button 
          onClick={handlePublish}
          className="w-full chunky-button py-5 rounded-3xl text-2xl font-display tracking-tight"
        >
          SYNC TO GALLERY
        </button>
      </div>
    </div>
  );
};

export default CreatePost;
