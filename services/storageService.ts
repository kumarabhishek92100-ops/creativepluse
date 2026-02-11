
// @google/genai guidelines followed: Directly using process.env.API_KEY for model calls elsewhere.
import { Post, Chat, Message, AppTheme, User, AvatarConfig, Comment } from '../types';
import { gun, user, mesh } from './gunService';

const SESSION_KEY = 'cp_universal_v1_session';
const THEME_KEY = 'cp_universal_v1_theme';

// Shared public nodes for the global feed
const GLOBAL_POSTS = gun.get('cp_v2_global_gallery_mesh');
const GLOBAL_USERS = gun.get('cp_v2_global_user_mesh');

export const getAvatarUrl = (config: AvatarConfig, seed: string) => {
  const params = new URLSearchParams();
  Object.entries(config || {}).forEach(([key, val]) => {
    if (val) params.append(key, val);
  });
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&${params.toString()}`;
};

export const storage = {
  // Decentralized Auth using Gun SEA
  async createAccount(alias: string, pass: string): Promise<{user: User | null, error?: string}> {
    return new Promise((resolve) => {
      user.create(alias, pass, (ack: any) => {
        if (ack.err) {
          resolve({ user: null, error: ack.err });
        } else {
          // Profile construction
          const id = `u-${Math.random().toString(36).substr(2, 9)}`;
          const newUser: User = {
            id,
            name: alias,
            avatar: `https://api.dicebear.com/7.x/big-smile/svg?seed=${id}`,
            role: 'Global Creator',
            joinedAt: new Date().toISOString(),
            bio: 'Just joined the global pulse.',
            followers: [],
            following: []
          };
          
          // Register in the public artist registry
          GLOBAL_USERS.get(alias).put(newUser);
          
          // Log in immediately
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
          // Fetch profile from registry
          GLOBAL_USERS.get(alias).once((data: any) => {
            const profile = data ? { ...data } : {
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

  // Global Real-time Post Syncing
  getGlobalFeed(callback: (posts: Post[]) => void) {
    const postsMap = new Map<string, Post>();
    
    // Listen to the global posts node
    GLOBAL_POSTS.map().on((data: any, id: string) => {
      if (!data) return;
      
      try {
        const post: Post = {
          ...data,
          author: typeof data.author === 'string' ? JSON.parse(data.author) : data.author,
          comments: typeof data.comments === 'string' ? JSON.parse(data.comments) : (data.comments || []),
          likedBy: typeof data.likedBy === 'string' ? JSON.parse(data.likedBy) : (data.likedBy || [])
        };
        
        postsMap.set(id, post);
        const sorted = Array.from(postsMap.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        callback(sorted);
      } catch (e) {
        console.error("Failed to parse global post", e);
      }
    });
  },

  savePost(post: Post) {
    // Stringify objects for Gun graph compatibility
    const flatPost = {
      ...post,
      author: JSON.stringify(post.author),
      comments: JSON.stringify(post.comments || []),
      likedBy: JSON.stringify(post.likedBy || [])
    };
    GLOBAL_POSTS.get(post.id).put(flatPost);
  },

  saveComment(postId: string, comment: Comment) {
    GLOBAL_POSTS.get(postId).once((data: any) => {
      if (!data) return;
      const comments = typeof data.comments === 'string' ? JSON.parse(data.comments) : [];
      comments.push(comment);
      GLOBAL_POSTS.get(postId).get('comments').put(JSON.stringify(comments));
    });
  },

  updateRating(postId: string, rating: number) {
    GLOBAL_POSTS.get(postId).get('rating').put(rating);
  },

  getAllArtists(callback: (users: User[]) => void) {
    const usersMap = new Map<string, User>();
    GLOBAL_USERS.map().on((data: any, id: string) => {
      if (data && data.name) {
        usersMap.set(id, data);
        callback(Array.from(usersMap.values()));
      }
    });
  },

  saveUser(userData: User) {
    this.setSession(userData);
    GLOBAL_USERS.get(userData.name).put(userData);
  },

  getTheme(): AppTheme {
    return (localStorage.getItem(THEME_KEY) as AppTheme) || 'sanctuary';
  },

  saveTheme(theme: AppTheme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  // Local-only fallback for Chats (could be moved to Gun in future)
  getChats(userId: string): Chat[] {
    const data = localStorage.getItem(`chats_${userId}`);
    return data ? JSON.parse(data) : [];
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
        return { ...c, messages: [...c.messages, message], lastMessage: message.text };
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
      lastMessage: 'Group started.'
    };
    const chats = this.getChats(ownerId);
    this.saveChats(ownerId, [newChat, ...chats]);
    return newChat;
  },

  addParticipantToGroup(userId: string, chatId: string, participant: User): Chat[] | null {
    const chats = this.getChats(userId);
    const idx = chats.findIndex(c => c.id === chatId);
    if (idx === -1) return null;
    chats[idx].participants.push(participant);
    this.saveChats(userId, chats);
    return chats;
  },

  getPosts(userId: string): Post[] {
    // Filter the global cache for this user's posts
    // This is handled by the App state usually
    return [];
  },

  // Implement exportWorkspace for cloud/local backup
  exportWorkspace() {
    const userSession = this.getSession();
    const data = {
      session: userSession,
      theme: this.getTheme(),
      chats: userSession ? this.getChats(userSession.id) : []
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pulse_backup_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  // Implement importWorkspace for backup restoration
  importWorkspace(content: string): boolean {
    try {
      const data = JSON.parse(content);
      if (data.session) this.setSession(data.session);
      if (data.theme) this.saveTheme(data.theme);
      if (data.session && data.chats) this.saveChats(data.session.id, data.chats);
      return true;
    } catch (e) {
      console.error("Import Error:", e);
      return false;
    }
  }
};
