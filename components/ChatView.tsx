
import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message } from '../types';
import { storage } from '../services/storageService';
import { realtime } from '../services/realtimeService';
import { GoogleGenAI } from "@google/genai";
import { gun } from '../services/gunService';

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
  const [presence, setPresence] = useState<Record<string, number>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchHandle, setSearchHandle] = useState('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'error'>('idle');
  const [showManifestGroup, setShowManifestGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Heartbeat: Publish "online" status to the global registry
    const hb = setInterval(() => {
      gun.get('cp_v3_global_presence').get(currentUser.name).put(Date.now());
    }, 10000);

    // Monitor Presence: Listen for all users' heartbeats
    gun.get('cp_v3_global_presence').map().on((time: number, name: string) => {
      setPresence(prev => ({ ...prev, [name]: time }));
    });

    const localChats = storage.getChats(currentUser.id);
    if (localChats.length === 0) {
      const firstChat: Chat = {
        id: 'ai-welcome',
        participants: [AI_PEERS[0]],
        messages: [{ id: 'm1', senderId: 'ai-1', senderName: 'Lumi_AI', text: 'Universal frequencies aligned. How shall we create today?', timestamp: Date.now() }],
        isGroup: false,
        lastMessage: 'Ready to sync.'
      };
      storage.saveChats(currentUser.id, [firstChat]);
      setChats([firstChat]);
    } else {
      setChats(localChats);
    }

    storage.getAllArtists(setAllUsers);

    return () => {
      clearInterval(hb);
      gun.get('cp_v3_global_presence').off();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChat]);

  const handleSearchFriend = async () => {
    if (!searchHandle.trim()) return;
    setSearchStatus('searching');
    const handle = searchHandle.startsWith('@') ? searchHandle.slice(1) : searchHandle;
    
    try {
      const friend = await storage.followUser(currentUser, handle);
      if (friend) {
        setSearchStatus('found');
        const existing = chats.find(c => !c.isGroup && c.participants.some(p => p.name === handle));
        if (!existing) {
          const newChat: Chat = {
            id: `chat-${Date.now()}`,
            participants: [friend],
            messages: [],
            isGroup: false,
            lastMessage: 'Pulse aligned.'
          };
          const updated = [newChat, ...chats];
          storage.saveChats(currentUser.id, updated);
          setChats(updated);
          setActiveChat(newChat);
        } else {
          setActiveChat(existing);
        }
        setSearchHandle('');
      } else {
        setSearchStatus('error');
      }
    } catch (e) {
      setSearchStatus('error');
    }
    setTimeout(() => setSearchStatus('idle'), 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || !currentUser) return;

    const msgPayload: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: inputText,
      timestamp: Date.now()
    };

    const updated = storage.sendMessage(activeChat.id, msgPayload);
    setChats(updated);
    setInputText('');

    // Handle AI Muse response if AI is in the chat
    if (activeChat.participants.some(p => p.id.startsWith('ai-'))) {
      setIsTyping(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `You are an AI Muse. An artist said: "${inputText}". Respond briefly and creatively in under 20 words.`,
        });
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          senderId: activeChat.participants[0].id,
          senderName: activeChat.participants[0].name,
          text: response.text || 'Resonating.',
          timestamp: Date.now()
        };
        const final = storage.sendMessage(activeChat.id, aiMsg);
        setChats(final);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const isOnline = (name: string) => {
    const lastSeen = presence[name];
    return lastSeen && (Date.now() - lastSeen < 30000);
  };

  const currentActive = activeChat ? chats.find(c => c.id === activeChat.id) : null;

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      {/* Sidebar */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-[var(--border)] bg-[var(--nav-bg)] backdrop-blur-xl`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-2xl uppercase tracking-tighter">Frequencies</h2>
            <button onClick={() => setShowManifestGroup(true)} className="w-10 h-10 rounded-full border-2 border-[var(--border)] flex items-center justify-center bg-white hover:scale-110 transition-all shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
            </button>
          </div>

          <div className="relative mb-6">
            <input 
              type="text" 
              placeholder="Find handle @alias..." 
              className="w-full retro-input !py-3 text-xs pr-12"
              value={searchHandle}
              onChange={e => setSearchHandle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchFriend()}
            />
            <button 
              onClick={handleSearchFriend}
              disabled={searchStatus === 'searching'}
              className="absolute right-2 top-1.5 w-8 h-8 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center border border-[var(--border)] shadow-sm hover:scale-105 transition-all"
            >
              {searchStatus === 'searching' ? '...' : searchStatus === 'found' ? '✓' : searchStatus === 'error' ? '?' : '+'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-2">
          {chats.map(chat => {
            const peer = !chat.isGroup ? chat.participants[0] : null;
            const online = peer ? isOnline(peer.name) : false;
            return (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`w-full flex items-center space-x-4 p-4 rounded-3xl transition-all ${activeChat?.id === chat.id ? 'bg-[var(--border)] text-white shadow-lg' : 'hover:bg-[var(--input-bg)]'}`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full border-2 border-[var(--border)] overflow-hidden bg-white">
                    <img src={chat.isGroup ? `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.id}` : chat.participants[0].avatar} alt="" />
                  </div>
                  {online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 text-left truncate">
                  <p className="font-heading text-sm uppercase truncate">{chat.isGroup ? chat.groupName : chat.participants[0].name}</p>
                  <p className={`text-[10px] truncate ${activeChat?.id === chat.id ? 'text-white/70' : 'opacity-60'} italic`}>{chat.lastMessage}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${activeChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-transparent`}>
        {activeChat && currentActive ? (
          <>
            <div className="p-4 md:p-6 border-b border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden p-2">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div className="w-10 h-10 rounded-full border border-[var(--border)] overflow-hidden bg-white">
                  <img src={currentActive.isGroup ? `https://api.dicebear.com/7.x/identicon/svg?seed=${currentActive.id}` : currentActive.participants[0].avatar} alt="" />
                </div>
                <div>
                  <h3 className="font-heading text-sm uppercase leading-none">{currentActive.isGroup ? currentActive.groupName : currentActive.participants[0].name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                     {!currentActive.isGroup && (
                       <div className={`w-1.5 h-1.5 rounded-full ${isOnline(currentActive.participants[0].name) ? 'bg-green-500' : 'bg-gray-400 opacity-30'}`}></div>
                     )}
                     <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">
                        {isOnline(currentActive.participants[0].name) ? 'Resonating Now' : 'Offline'}
                     </p>
                  </div>
                </div>
              </div>
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
                   <div className="w-1 h-1 bg-[var(--primary)] rounded-full animate-bounce"></div>
                   <div className="w-1 h-1 bg-[var(--primary)] rounded-full animate-bounce delay-100"></div>
                   <div className="w-1 h-1 bg-[var(--primary)] rounded-full animate-bounce delay-200"></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 md:p-8 bg-[var(--card-bg)] border-t border-[var(--border)]">
              <div className="flex items-center space-x-3 bg-[var(--input-bg)] p-2 rounded-[2rem] border border-[var(--border)] shadow-sm focus-within:border-[var(--primary)] transition-colors">
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
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-20">
            <h3 className="font-display text-3xl uppercase italic tracking-tighter">Enter the Stream</h3>
            <p className="text-[10px] font-bold uppercase tracking-[0.5em] mt-6">Select a peer to resonate</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
