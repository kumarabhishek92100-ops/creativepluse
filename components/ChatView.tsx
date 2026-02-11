
import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message } from '../types';
import { storage } from '../services/storageService';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    // Pass currentUser.id to getChats
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
      // Pass currentUser.id and chats to saveChats
      storage.saveChats(currentUser.id, defaultChats);
      setChats(defaultChats);
    } else {
      setChats(localChats);
    }
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

    // sendMessage handles internal registry updates
    const updated = storage.sendMessage(activeChat.id, msgPayload);
    setChats(updated);
    setInputText('');

    // AI logic (The Muse)
    if (activeChat.participants.some(p => p.id.startsWith('ai-'))) {
      setIsTyping(true);
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

  const currentActive = activeChat ? chats.find(c => c.id === activeChat.id) : null;

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-[var(--border)] bg-[var(--nav-bg)] backdrop-blur-xl`}>
        <div className="p-6">
          <h2 className="font-display text-2xl uppercase tracking-tighter">Muses</h2>
          <div className="mt-2 sticker !rotate-0 text-[8px] bg-[var(--primary)] text-white">Local Encrypted Channel</div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-2">
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={`w-full flex items-center space-x-4 p-4 rounded-3xl transition-all ${activeChat?.id === chat.id ? 'bg-[var(--border)] text-white shadow-lg' : 'hover:bg-[var(--input-bg)]'}`}
            >
              <div className="w-12 h-12 rounded-full border-2 border-[var(--border)] overflow-hidden flex-shrink-0 bg-white">
                <img src={chat.participants[0].avatar} alt="" />
              </div>
              <div className="flex-1 text-left truncate">
                <p className="font-heading text-sm uppercase truncate">{chat.participants[0].name}</p>
                <p className="text-[10px] truncate opacity-60 italic">{chat.lastMessage}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`${activeChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-transparent`}>
        {activeChat && currentActive ? (
          <>
            <div className="p-4 md:p-6 border-b border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 text-[var(--text-main)]">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div className="w-10 h-10 rounded-full border border-[var(--border)] overflow-hidden bg-white">
                  <img src={currentActive.participants[0].avatar} alt="" />
                </div>
                <div>
                  <h3 className="font-heading text-sm uppercase leading-none">{currentActive.participants[0].name}</h3>
                  <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1">Studio Muse</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
              {currentActive.messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
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
    </div>
  );
};

export default ChatView;
