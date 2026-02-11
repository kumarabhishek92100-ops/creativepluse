
import React, { useState } from 'react';
import { Post, Comment } from '../types';

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

  const handleAddReview = (score: number) => {
    setRating(score);
    onUpdate({ ...post, rating: score });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    const comment: Comment = { 
      id: `c-${Date.now()}`, 
      author: { 
        id: 'me', 
        name: 'PEER', 
        avatar: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Peer', 
        role: 'Reviewer',
        joinedAt: new Date().toISOString()
      }, 
      text: newComment, 
      createdAt: new Date().toLocaleDateString()
    };
    
    onUpdate({ ...post, comments: [...(post.comments || []), comment] });
    setNewComment('');
  };

  return (
    <div className="chunky-card rounded-[3rem] overflow-hidden bg-[var(--card-bg)] animate-fade-in">
      {/* Header */}
      <div className="p-6 border-b-2 border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => onUserClick?.(post.author.id)} className="flex items-center space-x-4 hover:opacity-70 transition-opacity">
            <div className="w-12 h-12 rounded-2xl border-2 border-[var(--border)] overflow-hidden shadow-sm bg-white">
              <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <h4 className="font-heading text-sm uppercase tracking-tight">{post.author.name}</h4>
              <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{post.author.role}</span>
            </div>
          </button>
          <div className={`px-2 py-0.5 rounded-lg border border-[var(--border)] text-[7px] font-bold uppercase tracking-widest ${post.visibility === 'public' ? 'bg-green-100' : 'bg-amber-100'}`}>
             {post.visibility === 'public' ? '🌍 Public' : '🔒 Circle'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-[var(--primary)] text-white px-3 py-1 rounded-xl font-display text-sm border-2 border-[var(--border)] shadow-sm">
            {rating}.0
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="rounded-[2.5rem] border-2 border-[var(--border)] overflow-hidden aspect-square relative bg-neutral-100">
           {post.imageUrl ? (
             <img src={post.imageUrl} className="w-full h-full object-cover" alt="" />
           ) : (
             <div className="w-full h-full flex items-center justify-center p-12 text-center">
                <p className="text-2xl font-display uppercase leading-tight italic opacity-20">{post.caption}</p>
             </div>
           )}
           <div className="absolute bottom-4 right-4 sticker bg-white text-[8px]">{post.createdAt}</div>
        </div>
      </div>

      {/* Interactions */}
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
          </div>
          <div className="flex -space-x-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-300"></div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-white bg-[var(--border)] text-white text-[8px] flex items-center justify-center font-bold">+{post.likes}</div>
          </div>
        </div>

        <p className="text-sm font-medium mb-8 leading-relaxed">
          <span className="font-heading text-[var(--primary)] uppercase text-xs mr-2">{post.author.name}</span>
          {post.caption}
        </p>

        {showReviews && (
          <div className="border-t-2 border-dashed border-[var(--border)] pt-8 space-y-6 animate-fade-in">
             <div className="flex items-center justify-between mb-4">
                <h5 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Peer Reviews</h5>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => handleAddReview(star)} className={`text-lg transition-transform hover:scale-125 ${rating >= star ? 'grayscale-0' : 'grayscale opacity-20'}`}>⭐</button>
                  ))}
                </div>
             </div>

             <div className="space-y-4 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {post.comments?.map(c => (
                  <div key={c.id} className="flex gap-3 items-start">
                    <img src={c.author.avatar} className="w-6 h-6 rounded-lg border border-[var(--border)]" alt="" />
                    <div className="flex-1 bg-[var(--input-bg)] p-3 rounded-2xl text-xs shadow-sm">
                      <p className="font-bold text-[8px] uppercase mb-1">{c.author.name}</p>
                      <p>{c.text}</p>
                    </div>
                  </div>
                ))}
             </div>

             <form onSubmit={handleAddComment} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Leave a review..." 
                  className="flex-1 retro-input !py-3 text-xs"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                />
                <button type="submit" className="chunky-button px-6 rounded-2xl bg-[var(--accent)] text-white !shadow-none active:scale-95 transition-transform">
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
