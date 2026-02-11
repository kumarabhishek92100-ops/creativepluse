
import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message } from '../types';
import { storage } from '../services/storageService';
import { realtime } from '../services/realtimeService';
import { GoogleGenAI } from "@google/genai";

const AI_PEERS: User[] = [
  { id: 'ai-1', name: 'Lumi_AI', avatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Lumi', role: 'Vibe Architect', joinedAt: new Date().toISOString() },
  { id: 'ai-2', name: 'Ink_Drift', avatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Ink', role: 'Lyricist', joinedAt: new Date().toISOString() },
];

interface ChatViewProps {
  currentUser: User;
}

const ChatView: React.FC<ChatViewProps> = ({ currentUser }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeUsers, setActiveUsers] = useState<Record<string, { name: string, avatar: string, lastSeen: number }>>({});
  const [showManifestGroup, setShowManifestGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [allArtists, setAllArtists] = useState<User[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    const localChats = storage.getChats(currentUser.id);
    if (localChats.length === 0) {
      const defaultChats: Chat[] = [
        {
          id: 'ai-muse-1',
          participants: [AI_PEERS[0]],
          messages: [{ id: 'm1', senderId: 'ai-1', senderName: 'Lumi_AI', text: 'Welcome to your private studio. I am your Muse. How can I help you manifest today?', timestamp: Date.now() }],
          isGroup: false,
          lastMessage: 'Ready to manifest.'
        }
      ];
      storage.saveChats(currentUser.id, defaultChats);
      setChats(defaultChats);
    } else {
      setChats(localChats);
    }

    setAllArtists(storage.getAllArtists().filter(a => a.id !== currentUser.id));

    const unsubscribe = realtime.subscribe((msg) => {
      if (msg.type === 'HEARTBEAT') {
        setActiveUsers(prev => ({
          ...prev,
          [msg.payload.userId]: { 
            name: msg.payload.userName, 
            avatar: msg.payload.avatar, 
            lastSeen: Date.now() 
          }
        }));
      }
    });

    const cleanup = setInterval(() => {
      setActiveUsers(prev => {
        const now = Date.now();
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          if (now - next[id].lastSeen > 15000) delete next[id];
        });
        return next;
      });
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(cleanup);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || !currentUser) return;

    const messageId = `msg-${Date.now()}`;
    const msgPayload: Message = {
      id: messageId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: inputText,
      timestamp: Date.now()
    };

    const updated = storage.sendMessage(activeChat.id, msgPayload);
    setChats(updated);
    setInputText('');

    if (activeChat.participants.some(p => p.id.startsWith('ai-'))) {
      setIsTyping(true);
      // Correct initialization: using process.env.API_KEY directly as per guidelines.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `You are an AI Creative Muse named ${activeChat.participants[0].name}. Response for: "${inputText}". Tone: Supportive artist. Max 20 words.`,
        });
        
        const aiPeer = activeChat.participants[0];
        const aiMsg: Message = { 
          id: `ai-${Date.now()}`, 
          senderId: aiPeer.id, 
          senderName: aiPeer.name,
          text: response.text || 'Beautiful thought.', 
          timestamp: Date.now() 
        };
        const finalChats = storage.sendMessage(activeChat.id, aiMsg);
        setChats(finalChats);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const manifestGroup = () => {
    if (!groupName || selectedArtists.length === 0) return;
    const participants = allArtists.filter(a => selectedArtists.includes(a.id));
    const newChat = storage.createGroup(currentUser.id, groupName, participants);
    if (newChat) {
      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat);
      setShowManifestGroup(false);
      setGroupName('');
      setSelectedArtists([]);
    }
  };

  const addMember = (artist: User) => {
    if (!activeChat) return;
    const updated = storage.addParticipantToGroup(currentUser.id, activeChat.id, artist);
    if (updated) setChats(updated);
    setShowAddMember(false);
  };

  const currentActive = activeChat ? chats.find(c => c.id === activeChat.id) : null;

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      {/* Sidebar */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-[var(--border)] bg-[var(--nav-bg)] backdrop-blur-xl`}>
        <div className="p-6 flex justify-between items-center">
          <div>
            <h2 className="font-display text-2xl uppercase tracking-tighter">Muses</h2>
            <div className="mt-2 sticker !rotate-0 text-[8px] bg-[var(--primary)] text-white">Local Encrypted Channel</div>
          </div>
          <button onClick={() => setShowManifestGroup(true)} className="w-10 h-10 rounded-full border-2 border-[var(--border)] flex items-center justify-center bg-white hover:scale-110 transition-all shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>

        {/* Presence Section */}
        <div className="px-6 mb-4">
           <h4 className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-3">Pulse Status</h4>
           <div className="flex -space-x-3 overflow-hidden h-10 items-center">
              {/* Fix type errors for 'data' which was inferred as unknown by casting to any */}
              {Object.entries(activeUsers).map(([id, data]) => (
                <div key={id} className="relative group" title={(data as any).name}>
                   <img src={(data as any).avatar} className="w-8 h-8 rounded-full border-2 border-[var(--border)] bg-white" alt={(data as any).name} />
                   <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                </div>
              ))}
              {Object.keys(activeUsers).length === 0 && <span className="text-[7px] font-bold uppercase opacity-20 ml-3">Silent Spectrum</span>}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-2">
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={`w-full flex items-center space-x-4 p-4 rounded-3xl transition-all ${activeChat?.id === chat.id ? 'bg-[var(--border)] text-white shadow-lg' : 'hover:bg-[var(--input-bg)]'}`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full border-2 border-[var(--border)] overflow-hidden bg-white">
                  <img src={chat.isGroup ? `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.id}` : chat.participants[0].avatar} alt="" />
                </div>
                {!chat.isGroup && activeUsers[chat.participants[0].id] && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 text-left truncate">
                <p className="font-heading text-sm uppercase truncate">{chat.isGroup ? chat.groupName : chat.participants[0].name}</p>
                <p className="text-[10px] truncate opacity-60 italic">{chat.lastMessage}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${activeChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-transparent`}>
        {activeChat && currentActive ? (
          <>
            <div className="p-4 md:p-6 border-b border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 text-[var(--text-main)]">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div className="w-10 h-10 rounded-full border border-[var(--border)] overflow-hidden bg-white">
                  <img src={currentActive.isGroup ? `https://api.dicebear.com/7.x/identicon/svg?seed=${currentActive.id}` : currentActive.participants[0].avatar} alt="" />
                </div>
                <div>
                  <h3 className="font-heading text-sm uppercase leading-none">{currentActive.isGroup ? currentActive.groupName : currentActive.participants[0].name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                     <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">
                        {currentActive.isGroup ? `${currentActive.participants.length} Artists Manifested` : 'Studio Muse'}
                     </p>
                  </div>
                </div>
              </div>
              {currentActive.isGroup && (
                <button onClick={() => setShowAddMember(true)} className="p-2 bg-[var(--input-bg)] rounded-xl border border-[var(--border)] shadow-sm hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
              {currentActive.messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
                    {!isMe && currentActive.isGroup && <span className="text-[7px] font-bold uppercase opacity-30 mb-1 ml-4">{msg.senderName}</span>}
                    <div className={`max-w-[85%] p-4 ${isMe ? 'msg-self' : 'msg-other'}`}>
                      <p className="text-sm font-medium leading-relaxed break-words">{msg.text}</p>
                    </div>
                    <span className="text-[7px] mt-1.5 opacity-40 uppercase font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex items-center gap-2 p-3 bg-[var(--input-bg)] rounded-3xl w-fit">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-[var(--primary)] rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-[var(--primary)] rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></div>
                    <div className="w-1 h-1 bg-[var(--primary)] rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 md:p-8 bg-[var(--card-bg)] border-t border-[var(--border)]">
              <div className="flex items-center space-x-3 bg-[var(--input-bg)] p-2 rounded-[2rem] border border-[var(--border)] shadow-sm">
                <input
                  type="text"
                  placeholder="Share your resonance..."
                  className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-sm font-medium"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button type="submit" className="w-11 h-11 chunky-button !rounded-full flex items-center justify-center !shadow-none active:scale-90">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-20 select-none">
            <h3 className="font-display text-3xl uppercase italic tracking-tighter">Enter the Stream</h3>
            <p className="text-[10px] font-bold uppercase tracking-[0.5em] mt-6">Secure Local Studio</p>
          </div>
        )}
      </div>

      {/* Manifest Group Modal */}
      {showManifestGroup && (
        <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowManifestGroup(false)}>
           <div className="chunky-card w-full max-w-md p-8 rounded-[3rem]" onClick={e => e.stopPropagation()}>
              <h2 className="font-display text-2xl uppercase mb-6">Manifest Group</h2>
              <input 
                type="text" 
                placeholder="Group Resonance Name..." 
                className="w-full retro-input mb-6"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
              />
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3">Add Members</p>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-8 pr-2 custom-scrollbar">
                 {allArtists.map(artist => (
                   <button 
                    key={artist.id} 
                    onClick={() => {
                      if (selectedArtists.includes(artist.id)) setSelectedArtists(prev => prev.filter(id => id !== artist.id));
                      else setSelectedArtists(prev => [...prev, artist.id]);
                    }}
                    className={`w-full flex items-center gap-4 p-3 rounded-2xl border-2 transition-all ${selectedArtists.includes(artist.id) ? 'bg-[var(--primary)] text-white border-[var(--border)] shadow-md' : 'bg-[var(--input-bg)] border-transparent'}`}
                   >
                     <img src={artist.avatar} className="w-8 h-8 rounded-full border border-white" alt="" />
                     <span className="font-heading text-xs uppercase">{artist.name}</span>
                   </button>
                 ))}
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowManifestGroup(false)} className="flex-1 py-4 text-[10px] font-bold uppercase opacity-40">Cancel</button>
                 <button onClick={manifestGroup} className="flex-2 chunky-button py-4 px-8 rounded-2xl">Create Session</button>
              </div>
           </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowAddMember(false)}>
           <div className="chunky-card w-full max-w-sm p-8 rounded-[3rem]" onClick={e => e.stopPropagation()}>
              <h2 className="font-display text-xl uppercase mb-6">Invite Artist</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                 {allArtists.filter(a => !activeChat?.participants.some(p => p.id === a.id)).map(artist => (
                   <button 
                    key={artist.id} 
                    onClick={() => addMember(artist)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--input-bg)] border-2 border-transparent hover:border-[var(--primary)] transition-all group"
                   >
                     <img src={artist.avatar} className="w-10 h-10 rounded-full border-2 border-[var(--border)]" alt="" />
                     <div className="text-left">
                        <p className="font-heading text-xs uppercase">{artist.name}</p>
                        <p className="text-[8px] opacity-40 uppercase">{artist.role}</p>
                     </div>
                   </button>
                 ))}
                 {allArtists.filter(a => !activeChat?.participants.some(p => p.id === a.id)).length === 0 && (
                   <p className="text-center py-8 opacity-40 text-xs italic uppercase">All known artists are here.</p>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ChatView;
