
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
  const currentUser = storage.getSession();
  const isLiked = currentUser ? post.likedBy?.includes(currentUser.name) : false;
  
  const [rating, setRating] = useState(post.rating || 5);
  const [showReviews, setShowReviews] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [progress, setProgress] = useState(0);
  const [resonating, setResonating] = useState(false);

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

  const handleLike = () => {
    if (!currentUser) return;
    storage.toggleLike(post.id, currentUser.name);
  };

  const handleResonate = async () => {
    if (resonating) return;
    setResonating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Respond to this artist's manifesto as a fellow creator: "${post.caption}". Tone: Inspired, brief (1 sentence).`,
      });
      
      const peerComment: Comment = {
        id: `global-${Date.now()}`,
        author: {
          id: `gp-${Math.random()}`,
          name: ['Nova_Sky', 'Zen_Ink', 'Void_Mural', 'Neon_Soul'][Math.floor(Math.random() * 4)],
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${Math.random()}`,
          role: 'Mesh Peer',
          joinedAt: new Date().toISOString()
        },
        text: response.text || "Pulse received.",
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

  if (!post.author) return null;

  return (
    <div className="chunky-card rounded-[3rem] overflow-hidden bg-[var(--card-bg)] animate-fade-in mb-12 border-4">
      <div className="p-6 border-b-4 border-[var(--border)] flex items-center justify-between">
        <button onClick={() => onUserClick?.(post.author.id)} className="flex items-center space-x-4 hover:opacity-70 transition-opacity">
          <div className="w-12 h-12 rounded-2xl border-2 border-[var(--border)] overflow-hidden shadow-sm bg-white">
            <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="text-left">
            <h4 className="font-heading text-sm uppercase tracking-tight">{post.author.name}</h4>
            <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{post.author.role}</span>
          </div>
        </button>
        <div className="bg-[var(--primary)] text-white px-3 py-1 rounded-xl font-display text-sm border-2 border-[var(--border)]">
          {post.likes || 0} RESONANCE
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-[2.5rem] border-4 border-[var(--border)] overflow-hidden aspect-square relative bg-neutral-100">
          {post.imageUrl ? (
            <img src={post.imageUrl} className="w-full h-full object-cover" alt="" />
          ) : post.videoUrl ? (
            <video src={post.videoUrl} className="w-full h-full object-cover" controls />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-12 text-center bg-[var(--input-bg)]">
              <p className="text-2xl font-display uppercase leading-tight italic opacity-20">{post.caption}</p>
            </div>
          )}
          <div className="absolute bottom-4 right-4 sticker bg-white text-[8px]">{new Date(post.createdAt).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="p-8 pt-2">
        <div className="flex gap-4 mb-8">
          <button 
            onClick={handleLike} 
            className={`w-14 h-14 rounded-full border-4 border-[var(--border)] flex items-center justify-center transition-all ${isLiked ? 'bg-[var(--secondary)] text-white shadow-lg' : 'bg-white'}`}
          >
            <svg className="w-7 h-7" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
          </button>
          <button 
            onClick={() => setShowReviews(!showReviews)}
            className={`w-14 h-14 rounded-full border-4 border-[var(--border)] flex items-center justify-center transition-all ${showReviews ? 'bg-[var(--primary)] text-white' : 'bg-white'}`}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          </button>
          <button 
            onClick={handleResonate}
            className="w-14 h-14 rounded-full border-4 border-[var(--border)] flex items-center justify-center bg-white hover:bg-[var(--accent)] transition-all"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </button>
        </div>

        <p className="text-sm font-medium leading-relaxed mb-6">
          <span className="font-heading text-[var(--primary)] uppercase text-xs mr-2">{post.author.name}</span>
          {post.caption}
        </p>

        {showReviews && (
          <div className="border-t-4 border-dashed border-[var(--border)] pt-8 space-y-6 animate-fade-in">
             <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {post.comments?.map(c => (
                  <div key={c.id} className="flex gap-3 items-start">
                    <img src={c.author.avatar} className="w-8 h-8 rounded-xl border-2 border-[var(--border)]" alt="" />
                    <div className="flex-1 bg-[var(--input-bg)] p-4 rounded-3xl text-xs border-2 border-[var(--border)] shadow-sm">
                      <p className="font-bold text-[8px] uppercase mb-1">{c.author.name}</p>
                      <p className="italic">"{c.text}"</p>
                    </div>
                  </div>
                ))}
             </div>
             <form onSubmit={handleAddComment} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Sync comment..." 
                  className="flex-1 retro-input !py-3 text-xs"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                />
                <button type="submit" className="chunky-button px-6 rounded-2xl bg-[var(--accent)]">
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
