
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

interface RoomProps {
  onExit: () => void;
}

// Manual implementation of encode as per Live API guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Manual implementation of decode as per Live API guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

// Manual implementation of audio decoding logic as per Live API guidelines
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const Room: React.FC<RoomProps> = ({ onExit }) => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [inLobby, setInLobby] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const nextStartTime = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    if (inLobby) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => { 
          streamRef.current = stream;
          if (lobbyVideoRef.current) lobbyVideoRef.current.srcObject = stream; 
        })
        .catch(err => console.error("Lobby Access Denied:", err));
    }
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [inLobby]);

  const createRoom = () => {
    const newId = Math.random().toString(36).substring(7);
    setRoomId(newId);
  };

  const joinSession = async () => {
    setInLobby(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 200);
    } catch (err) { console.error(err); }
  };

  const summonAI = async () => {
    if (aiActive || !process.env.API_KEY) return;
    setAiActive(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    inputAudioContext.current = new AudioContext({sampleRate: 16000});
    outputAudioContext.current = new AudioContext({sampleRate: 24000});
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          const source = inputAudioContext.current!.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContext.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
            // Solely rely on sessionPromise resolve to send audio input as per guidelines
            sessionPromise.then(s => s.sendRealtimeInput({ 
              media: { 
                data: encode(new Uint8Array(int16.buffer)), 
                mimeType: 'audio/pcm;rate=16000' 
              } 
            }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.current!.destination);
        },
        onmessage: async (msg) => {
          // Handle interruptions as per Live API guidelines
          if (msg.serverContent?.interrupted) {
            sourcesRef.current.forEach(source => {
              try { source.stop(); } catch(e) {}
            });
            sourcesRef.current.clear();
            nextStartTime.current = 0;
            return;
          }

          const parts = msg.serverContent?.modelTurn?.parts;
          const audio = parts && parts.length > 0 ? parts[0]?.inlineData?.data : null;
          
          if (audio && outputAudioContext.current) {
            const buffer = await decodeAudioData(decode(audio), outputAudioContext.current, 24000, 1);
            const source = outputAudioContext.current.createBufferSource();
            source.buffer = buffer;
            source.connect(outputAudioContext.current.destination);
            
            // Gapless playback queueing using nextStartTime running cursor
            nextStartTime.current = Math.max(nextStartTime.current, outputAudioContext.current.currentTime);
            source.start(nextStartTime.current);
            nextStartTime.current += buffer.duration;
            
            sourcesRef.current.add(source);
            source.onended = () => sourcesRef.current.delete(source);
          }
        },
        onclose: () => setAiActive(false),
      },
      config: { 
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        },
        systemInstruction: "You are the Workshop Muse. Poetic, supportive, and focused on creative manifestation." 
      }
    });
  };

  if (inLobby) {
    return (
      <div className="flex items-center justify-center min-h-full p-6 animate-fade-in">
        <div className="chunky-card max-w-xl w-full p-8 md:p-12 rounded-[2.5rem] text-center">
           <div className="relative mb-10 rounded-[2rem] overflow-hidden aspect-video border-2 border-[var(--border)] bg-black">
              <video ref={lobbyVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              <div className="absolute bottom-6 left-6 sticker !rotate-0">Studio_Check</div>
           </div>
           
           <h2 className="text-3xl font-display mb-4 uppercase italic">Manifestation_Portal</h2>
           <p className="text-sm opacity-60 mb-10 px-8">Ready to enter the collective artist workshop?</p>
           
           <div className="flex flex-col sm:flex-row gap-4">
              {!roomId ? (
                <button onClick={createRoom} className="flex-1 py-5 rounded-3xl chunky-button text-xs tracking-widest shadow-xl">INITIATE SESSION</button>
              ) : (
                <button onClick={joinSession} className="flex-1 py-5 rounded-3xl chunky-button !bg-[var(--accent)] text-xs tracking-widest shadow-xl">ENTER WORKSHOP</button>
              )}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-transparent animate-fade-in">
      <div className="px-6 py-4 flex justify-between items-center bg-[var(--nav-bg)] border-b border-[var(--border)] z-[20]">
        <div className="flex items-center space-x-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--secondary)]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]"></div>
          </div>
          <h2 className="font-heading text-[10px] uppercase tracking-[0.4em] ml-4 opacity-50">WORKSHOP_ID :: {roomId?.toUpperCase()}</h2>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={summonAI} className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border-2 border-[var(--border)] ${aiActive ? 'bg-[var(--primary)] text-white' : 'bg-transparent'}`}>
             {aiActive ? 'MUSE_ACTIVE' : 'AWAKEN_MUSE'}
          </button>
          <button onClick={onExit} className="w-10 h-10 rounded-full bg-[var(--secondary)] flex items-center justify-center text-white active:scale-90 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-auto">
        <div className="chunky-card rounded-[2.5rem] overflow-hidden flex flex-col">
           <div className="bg-black relative flex-1">
              <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover scale-x-[-1] ${isCameraOff ? 'opacity-0' : 'opacity-100'}`} />
              <div className="absolute bottom-6 left-6 sticker !rotate-0 text-[10px]">LEAD_ARTIST</div>
           </div>
        </div>

        {aiActive && (
          <div className="chunky-card rounded-[2.5rem] overflow-hidden flex flex-col border-dashed bg-[var(--input-bg)] p-10 items-center justify-center text-center">
             <div className="w-20 h-20 bg-[var(--primary)] rounded-full animate-pulse mb-6"></div>
             <h3 className="font-heading text-lg uppercase tracking-tight mb-2">The Muse listens...</h3>
             <p className="text-xs opacity-50 uppercase tracking-widest">Resonating with your creative field</p>
          </div>
        )}
      </div>

      <div className="p-8 flex justify-center items-center space-x-8 bg-[var(--nav-bg)] border-t border-[var(--border)]">
         <button onClick={() => setIsMuted(!isMuted)} className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-[var(--border)] ${isMuted ? 'bg-[var(--secondary)]' : 'bg-white'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
         </button>
         <button onClick={() => setIsCameraOff(!isCameraOff)} className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-[var(--border)] ${isCameraOff ? 'bg-[var(--secondary)]' : 'bg-white'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
         </button>
      </div>
    </div>
  );
};

export default Room;
