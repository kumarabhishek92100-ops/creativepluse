
import { Post, Chat, Message, AppTheme, User, AvatarConfig } from '../types';
import { gun, user, mesh } from './gunService';

const SESSION_KEY = 'cp_universal_v1_session';
const THEME_KEY = 'cp_universal_v1_theme';

// Cache for synchronous access to global data streams
let cachedPosts: Post[] = [];
let cachedUsers: User[] = [];

// Initialize background listeners to keep the local cache synchronized with the Gun mesh
mesh.posts.map().on((data: any, id: string) => {
  if (data && data.id) {
    const postsMap = new Map(cachedPosts.map(p => [p.id, p]));
    postsMap.set(id, { ...data });
    cachedPosts = Array.from(postsMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
});

mesh.users.map().on((data: any, id: string) => {
  if (data && data.name) {
    const usersMap = new Map(cachedUsers.map(u => [u.id, u]));
    usersMap.set(id, { ...data });
    cachedUsers = Array.from(usersMap.values());
  }
});

export const getAvatarUrl = (config: AvatarConfig, seed: string) => {
  const params = new URLSearchParams();
  Object.entries(config || {}).forEach(([key, val]) => {
    if (val) params.append(key, val);
  });
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&${params.toString()}`;
};

export const storage = {
  async createAccount(alias: string, pass: string): Promise<{user: User | null, error?: string}> {
    return new Promise((resolve) => {
      user.create(alias, pass, (ack: any) => {
        if (ack.err) {
          resolve({ user: null, error: ack.err });
        } else {
          const id = `u-${Math.random().toString(36).substr(2, 9)}`;
          const newUser: User = {
            id,
            name: alias,
            avatar: `https://api.dicebear.com/7.x/big-smile/svg?seed=${id}`,
            role: 'Global Creator',
            joinedAt: new Date().toISOString(),
            bio: 'Joined the universal pulse.',
            followers: [],
            following: []
          };
          
          // Save to global user list
          mesh.users.get(alias).put(newUser);
          
          this.login(alias, pass).then(res => resolve(res));
        }
      });
    });
  },

  async login(alias: string, pass: string): Promise<{user: User | null, error?: string}> {
    return new Promise((resolve) => {
      user.auth(alias, pass, (ack: any) => {
        if (ack.err) {
          resolve({ user: null, error: ack.err });
        } else {
          // Fetch user profile from the mesh
          mesh.users.get(alias).once((data: any) => {
            const profile = data || {
              id: `u-${alias}`,
              name: alias,
              avatar: `https://api.dicebear.com/7.x/big-smile/svg?seed=${alias}`,
              role: 'Global Creator',
              joinedAt: new Date().toISOString()
            };
            this.setSession(profile);
            resolve({ user: profile });
          });
        }
      });
    });
  },

  setSession(userData: User) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  },

  getSession(): User | null {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch(e) { return null; }
  },

  getUser(): User | null {
    return this.getSession();
  },

  logout() {
    user.leave();
    localStorage.removeItem(SESSION_KEY);
  },

  // Updated to support optional callback while returning current cache for synchronous calls
  getGlobalFeed(callback?: (posts: Post[]) => void): Post[] {
    if (callback) {
      mesh.posts.map().on((data: any, id: string) => {
        if (data && data.id) {
          callback(cachedPosts);
        }
      });
    }
    return cachedPosts;
  },

  savePost(post: Post) {
    mesh.posts.get(post.id).put(post);
  },

  // Updated to support optional callback while returning current cache for synchronous calls
  getAllArtists(callback?: (users: User[]) => void): User[] {
    if (callback) {
      mesh.users.map().on((data: any, id: string) => {
        if (data && data.name) {
          callback(cachedUsers);
        }
      });
    }
    return cachedUsers;
  },

  getTheme(): AppTheme {
    return (localStorage.getItem(THEME_KEY) as AppTheme) || 'sanctuary';
  },

  saveTheme(theme: AppTheme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  saveUser(userData: User) {
    this.setSession(userData);
    mesh.users.get(userData.name).put(userData);
  },

  // Implementation of missing methods for the Chat system (Local storage for session persistence)
  getChats(userId: string): Chat[] {
    try {
      const data = localStorage.getItem(`chats_${userId}`);
      return data ? JSON.parse(data) : [];
    } catch(e) { return []; }
  },

  saveChats(userId: string, chats: Chat[]) {
    localStorage.setItem(`chats_${userId}`, JSON.stringify(chats));
  },

  sendMessage(chatId: string, message: Message): Chat[] {
    const user = this.getSession();
    if (!user) return [];
    const chats = this.getChats(user.id);
    const updated = chats.map(c => {
      if (c.id === chatId) {
        return { 
          ...c, 
          messages: [...c.messages, message], 
          lastMessage: message.text 
        };
      }
      return c;
    });
    this.saveChats(user.id, updated);
    return updated;
  },

  createGroup(ownerId: string, groupName: string, participants: User[]): Chat {
    const newChat: Chat = {
      id: `group-${Date.now()}`,
      participants,
      messages: [],
      isGroup: true,
      groupName,
      lastMessage: 'Group manifested.'
    };
    const chats = this.getChats(ownerId);
    this.saveChats(ownerId, [newChat, ...chats]);
    return newChat;
  },

  addParticipantToGroup(userId: string, chatId: string, artist: User): Chat[] {
    const chats = this.getChats(userId);
    const updated = chats.map(c => {
      if (c.id === chatId) {
        return { ...c, participants: [...c.participants, artist] };
      }
      return c;
    });
    this.saveChats(userId, updated);
    return updated;
  },

  // Implementation of missing methods for Profile and Workspace management
  getPosts(userId: string): Post[] {
    return cachedPosts.filter(p => p.author.id === userId);
  },

  importWorkspace(content: string): boolean {
    try {
      const data = JSON.parse(content);
      if (data.user) this.setSession(data.user);
      if (data.chats && data.user) this.saveChats(data.user.id, data.chats);
      return true;
    } catch(e) { return false; }
  },

  exportWorkspace() {
    const user = this.getSession();
    if (!user) return;
    const chats = this.getChats(user.id);
    const data = JSON.stringify({ user, chats });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse_backup_${user.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
