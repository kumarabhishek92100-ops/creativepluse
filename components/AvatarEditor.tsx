
import React, { useState } from 'react';
import { AvatarConfig, User } from '../types';
import { getAvatarUrl } from '../services/storageService';

interface AvatarEditorProps {
  user: User;
  onSave: (config: AvatarConfig) => void;
  onClose: () => void;
}

const OPTIONS = {
  top: ['longHair', 'shortHair', 'eyepatch', 'hat', 'hijab', 'turban'],
  accessories: ['none', 'kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers'],
  hairColor: ['2c1b18', '4a312c', '724130', 'b58143', 'c93305', 'f5972c'],
  clothing: ['blazer', 'collarAndSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'],
  eyes: ['default', 'close', 'cry', 'dizzy', 'eyeRoll', 'happy', 'hearts', 'side', 'squint', 'surprised', 'wink', 'winkWacky'],
};

const AvatarEditor: React.FC<AvatarEditorProps> = ({ user, onSave, onClose }) => {
  const [config, setConfig] = useState<AvatarConfig>(user.avatarConfig || {});

  const update = (key: keyof AvatarConfig, val: string) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="chunky-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-[3rem]">
        <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--nav-bg)]">
          <h2 className="font-display text-2xl uppercase tracking-tighter">Avatar Lab</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-10">
          <div className="w-full md:w-1/3 flex flex-col items-center">
            <div className="w-48 h-48 rounded-[3rem] border-2 border-[var(--border)] bg-white overflow-hidden mb-6 shadow-xl">
              <img src={getAvatarUrl(config, user.id)} className="w-full h-full object-cover" alt="Preview" />
            </div>
            <button 
              onClick={() => onSave(config)}
              className="w-full chunky-button py-4 rounded-2xl"
            >
              Sync Persona
            </button>
          </div>

          <div className="flex-1 space-y-6">
            {Object.entries(OPTIONS).map(([key, vals]) => (
              <div key={key}>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3 block">{key}</label>
                <div className="flex flex-wrap gap-2">
                  {vals.map(v => (
                    <button 
                      key={v}
                      onClick={() => update(key as keyof AvatarConfig, v)}
                      className={`px-3 py-1.5 text-[10px] rounded-lg border transition-all ${config[key as keyof AvatarConfig] === v ? 'bg-[var(--primary)] text-white border-[var(--border)]' : 'bg-[var(--input-bg)] border-transparent'}`}
                    >
                      {v.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarEditor;
