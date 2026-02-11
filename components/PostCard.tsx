
import React, { useState, useEffect } from 'react';
import { Post, Comment } from '../types';
import { GoogleGenAI } from "@google/genai";
import { storage } from '../services/storageService';

interface PostCardProps {
  post: Post;
  onUpdate: (updatedPost: Post) => void;
  onUserClick?: (userId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onUpdate, onUserClick }) => {
  const [liked, setLiked] = useState(false);
  const [rating, setRating] = useState(post.rating || 5);
  const [showReviews, setShowReviews] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [progress, setProgress] = useState(0);
  const [resonating, setResonating] = useState(false);

  const currentUser = storage.getSession();

  useEffect(() => {
    if (post.type === 'target' && post.deadline) {
      const start = new Date(post.createdAt).getTime();
      const end = new Date(post.deadline).getTime();
      const now = Date.now();
      const total = end - start;
      const current = now - start;
      const p = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
      setProgress(p);
    }
  }, [post.type, post.deadline, post.createdAt]);

  const handleResonate = async () => {
    if (resonating) return;
    setResonating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a random creative artist from a global network. Respond to this manifesto/post: "${post.caption}". Give a brief, inspired, 1-sentence comment as if you are a peer in another country.`,
      });
      
      const peerComment: Comment = {
        id: `global-${Date.now()}`,
        author: {
          id: `gp-${Math.random()}`,
          name: ['Sato_Art', 'Berlin_Vibe', 'NOLA_Ink', 'Seoul_Sync', 'Mural_Mind'][Math.floor(Math.random() * 5)],
          avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${Math.random()}`,
          role: 'Global Peer',
          joinedAt: new Date().toISOString()
        },
        text: response.text || "Resonating with your frequency.",
        createdAt: new Date().toLocaleDateString()
      };
      
      storage.saveComment(post.id, peerComment);
      setShowReviews(true);
    } finally {
      setResonating(false);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    
    const comment: Comment = { 
      id: `c-${Date.now()}`, 
      author: currentUser, 
      text: newComment, 
      createdAt: new Date().toLocaleDateString()
    };
    
    storage.saveComment(post.id, comment);
    setNewComment('');
  };

  const handleRating = (newVal: number) => {
    setRating(newVal);
    storage.updateRating(post.id, newVal);
  };

  if (!post.author) return null;

  return (
    <div className="chunky-card rounded-[3rem] overflow-hidden bg-[var(--card-bg)] animate-fade-in mb-12">
      <div className="p-6 border-b-2 border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => onUserClick?.(post.author.id)} className="flex items-center space-x-4 hover:opacity-70 transition-opacity">
            <div className="w-12 h-12 rounded-2xl border-2 border-[var(--border)] overflow-hidden shadow-sm bg-white">
              <img src={post.author.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback'} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <h4 className="font-heading text-sm uppercase tracking-tight">{post.author.name || 'Anonymous'}</h4>
              <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{post.author.role || 'Artist'}</span>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {post.type === 'target' && <div className="sticker !bg-[var(--secondary)] !text-white">MANIFESTATION</div>}
          <div className="bg-[var(--primary)] text-white px-3 py-1 rounded-xl font-display text-sm border-2 border-[var(--border)] shadow-sm">
            {rating}.0
          </div>
        </div>
      </div>

      <div className="p-4">
        {post.type === 'target' ? (
          <div className="rounded-[2.5rem] border-2 border-[var(--border)] overflow-hidden aspect-video relative bg-[var(--input-bg)] p-10 flex flex-col justify-center items-center text-center">
             <h3 className="text-3xl font-display uppercase italic mb-4 leading-none">{post.caption}</h3>
             <div className="w-full max-w-sm space-y-2 mt-4">
                <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest opacity-40">
                   <span>Resonance Progress</span>
                   <span>{progress}%</span>
                </div>
                <div className="w-full h-4 bg-white border-2 border-[var(--border)] rounded-full overflow-hidden p-0.5">
                   <div className="h-full bg-[var(--primary)] rounded-full transition-all duration-1000" style={{width: `${progress}%`}}></div>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest mt-4">
                   🎯 Target: <span className="text-[var(--secondary)]">{new Date(post.deadline || '').toLocaleDateString()}</span>
                </p>
             </div>
          </div>
        ) : (
          <div className="rounded-[2.5rem] border-2 border-[var(--border)] overflow-hidden aspect-square relative bg-neutral-100">
             {post.imageUrl ? (
               <img src={post.imageUrl} className="w-full h-full object-cover" alt="" />
             ) : post.videoUrl ? (
               <video src={post.videoUrl} className="w-full h-full object-cover" controls />
             ) : post.audioUrl ? (
               <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-[var(--accent)]/10">
                  <span className="text-6xl mb-6">🎙️</span>
                  <audio src={post.audioUrl} className="w-full" controls />
                  <p className="mt-8 text-xl font-display uppercase opacity-20 italic">Audio Fragment</p>
               </div>
             ) : (
               <div className="w-full h-full flex items-center justify-center p-12 text-center">
                  <p className="text-2xl font-display uppercase leading-tight italic opacity-20">{post.caption}</p>
               </div>
             )}
             <div className="absolute bottom-4 right-4 sticker bg-white text-[8px]">{new Date(post.createdAt).toLocaleDateString()}</div>
          </div>
        )}
      </div>

      <div className="p-8 pt-2">
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-4">
            <button 
              onClick={() => setLiked(!liked)} 
              className={`w-14 h-14 rounded-full border-2 border-[var(--border)] flex items-center justify-center transition-all ${liked ? 'bg-[var(--secondary)] text-white shadow-lg' : 'bg-transparent text-[var(--border)]'}`}
            >
              <svg className="w-7 h-7" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            </button>
            <button 
              onClick={() => setShowReviews(!showReviews)}
              className={`w-14 h-14 rounded-full border-2 border-[var(--border)] flex items-center justify-center transition-all ${showReviews ? 'bg-[var(--primary)] text-white' : 'bg-[var(--input-bg)]'}`}
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            </button>
            <button 
              onClick={handleResonate}
              disabled={resonating}
              className={`w-14 h-14 rounded-full border-2 border-[var(--border)] flex items-center justify-center transition-all bg-white hover:bg-[var(--primary)] hover:text-white ${resonating ? 'animate-spin' : ''}`}
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
          </div>
        </div>

        <p className="text-sm font-medium mb-8 leading-relaxed">
          <span className="font-heading text-[var(--primary)] uppercase text-xs mr-2">{post.author.name}</span>
          {post.caption}
        </p>

        {showReviews && (
          <div className="border-t-2 border-dashed border-[var(--border)] pt-8 space-y-6 animate-fade-in">
             <div className="flex items-center justify-between mb-4">
                <h5 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Global Resonances</h5>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => handleRating(star)} className={`text-lg transition-transform hover:scale-125 ${rating >= star ? 'grayscale-0' : 'grayscale opacity-20'}`}>⭐</button>
                  ))}
                </div>
             </div>
             <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {post.comments?.map(c => (
                  <div key={c.id} className="flex gap-3 items-start group">
                    <img src={c.author.avatar} className="w-8 h-8 rounded-xl border border-[var(--border)] bg-white" alt="" />
                    <div className="flex-1 bg-[var(--input-bg)] p-4 rounded-3xl text-xs shadow-sm relative">
                      <p className="font-bold text-[8px] uppercase mb-1 flex items-center justify-between">
                        {c.author.name}
                        {c.id.startsWith('global-') && <span className="sticker !bg-[var(--accent)] !text-[8px] !scale-75">MESH_PEER</span>}
                      </p>
                      <p className="italic">"{c.text}"</p>
                    </div>
                  </div>
                ))}
                {(!post.comments || post.comments.length === 0) && (
                  <p className="text-[10px] uppercase text-center opacity-30 py-4">No reviews yet. Be the first to resonate.</p>
                )}
             </div>
             <form onSubmit={handleAddComment} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Broadcast your frequency..." 
                  className="flex-1 retro-input !py-3 text-xs"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                />
                <button type="submit" className="chunky-button px-6 rounded-2xl bg-[var(--accent)] text-white !shadow-none active:scale-95">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                </button>
             </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCard;
