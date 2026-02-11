
import { Post, Chat, Message, AppTheme, User, AvatarConfig, Comment } from '../types';
import { gun, user, mesh } from './gunService';

const SESSION_KEY = 'cp_universal_v1_session';
const THEME_KEY = 'cp_universal_v1_theme';

// Cache for synchronous access to global data streams to keep UI snappy
let cachedPosts: Post[] = [];
let cachedUsers: User[] = [];

// Initialize background listeners to keep the local cache synchronized with the Gun mesh
// GunDB handles the heavy lifting of syncing across the internet.
mesh.posts.map().on((data: any, id: string) => {
  if (data && data.id) {
    // Process post from mesh
    const post: Post = {
      ...data,
      // Gun can flatten arrays, so we ensure comments is always an array
      comments: data.comments ? JSON.parse(data.comments) : [],
      author: data.author ? JSON.parse(data.author) : { name: 'Unknown' }
    };
    const postsMap = new Map(cachedPosts.map(p => [p.id, p]));
    postsMap.set(id, post);
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
          
          // Save to global user list for discovery
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

  getGlobalFeed(callback?: (posts: Post[]) => void): Post[] {
    if (callback) {
      mesh.posts.map().on(() => callback(cachedPosts));
    }
    return cachedPosts;
  },

  savePost(post: Post) {
    // We stringify nested objects for GunDB storage compatibility in some public relays
    const dataToStore = {
      ...post,
      author: JSON.stringify(post.author),
      comments: JSON.stringify(post.comments || [])
    };
    mesh.posts.get(post.id).put(dataToStore);
  },

  saveComment(postId: string, comment: Comment) {
    mesh.posts.get(postId).once((data: any) => {
      if (data) {
        const comments = data.comments ? JSON.parse(data.comments) : [];
        comments.push(comment);
        mesh.posts.get(postId).get('comments').put(JSON.stringify(comments));
      }
    });
  },

  updateRating(postId: string, rating: number) {
    mesh.posts.get(postId).get('rating').put(rating);
  },

  getAllArtists(callback?: (users: User[]) => void): User[] {
    if (callback) {
      mesh.users.map().on(() => callback(cachedUsers));
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

  // Chat implementation using the user's private mesh space
  getChats(userId: string, callback?: (chats: Chat[]) => void): Chat[] {
    // In a fully decentralized app, chats are stored under the user's graph
    // For simplicity here, we stick to local for drafts but can push to mesh
    const data = localStorage.getItem(`chats_${userId}`);
    const localChats = data ? JSON.parse(data) : [];
    if (callback) callback(localChats);
    return localChats;
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

  // Fix: Added missing addParticipantToGroup method to storage object for group management.
  addParticipantToGroup(userId: string, chatId: string, participant: User): Chat[] | null {
    const chats = this.getChats(userId);
    const chatIndex = chats.findIndex(c => c.id === chatId);
    if (chatIndex === -1) return null;

    const chat = chats[chatIndex];
    if (!chat.participants.find(p => p.id === participant.id)) {
      chat.participants = [...chat.participants, participant];
      chat.lastMessage = `${participant.name} joined the manifestation.`;
      this.saveChats(userId, chats);
    }
    return chats;
  },

  getPosts(userId: string): Post[] {
    return cachedPosts.filter(p => p.author.id === userId);
  },

  importWorkspace(content: string): boolean {
    try {
      const data = JSON.parse(content);
      if (data.user) this.setSession(data.user);
      return true;
    } catch(e) { return false; }
  },

  exportWorkspace() {
    const user = this.getSession();
    if (!user) return;
    const data = JSON.stringify({ user });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse_backup_${user.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
