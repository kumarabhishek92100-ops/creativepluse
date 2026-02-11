
export interface AvatarConfig {
  top?: string;
  accessories?: string;
  hairColor?: string;
  facialHair?: string;
  clothing?: string;
  eyes?: string;
  eyebrows?: string;
  mouth?: string;
  skin?: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  avatarConfig?: AvatarConfig;
  role: string;
  bio?: string;
  followers?: string[]; // Array of IDs
  following?: string[]; // Array of IDs
  joinedAt: string;
}

export type PostType = 'photo' | 'video' | 'audio' | 'text' | 'target' | 'sticker' | 'voiceover';
export type PostVisibility = 'public' | 'following';

export interface Post {
  id: string;
  author: User;
  type: PostType;
  visibility: PostVisibility;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  caption: string;
  likes: number;
  likedBy?: string[];
  rating: number;
  comments: Comment[];
  createdAt: string;
  deadline?: string;
  progress?: number; // 0-100 for goals
}

export interface Comment {
  id: string;
  author: User;
  text: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  participants: User[];
  messages: Message[];
  isGroup: boolean;
  groupName?: string;
  lastMessage?: string;
}

export interface PulseNotification {
  id: string;
  text: string;
  type: 'post' | 'like' | 'follow' | 'chat';
  userName: string;
  timestamp: number;
}

export type AppView = 'feed' | 'room' | 'profile' | 'create' | 'chat' | 'other-profile' | 'discovery' | 'calendar';
export type AppTheme = 'sanctuary' | 'midnight' | 'cyber' | 'paper';
