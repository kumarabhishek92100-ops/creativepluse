
import { Post, Chat, Message, AppTheme, User, AvatarConfig, Comment } from '../types';
import { gun, user, mesh } from './gunService';

const THEME_KEY = 'cp_universal_v1_theme';
const SESSION_KEY = 'cp_universal_v1_session';

// Added local cache for posts to support synchronous getPosts calls in ProfileView
let _cachedPosts: Post[] = [];

const safeParse = (data: any, fallback: any) => {
  if (typeof data !== 'string') return data || fallback;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
};

// Added missing getAvatarUrl export used by AvatarEditor and ProfileView
export function getAvatarUrl(config: AvatarConfig | undefined, userId: string): string {
  if (!config || Object.keys(config).length === 0) return `https://api.dicebear.com/7.x/big-smile/svg?seed=${userId}`;
  
  const params = new URLSearchParams();
  if (config.top) params.append('top', config.top);
  if (config.accessories) params.append('accessories', config.accessories);
  if (config.hairColor) params.append('hairColor', config.hairColor);
  if (config.clothing) params.append('clothing', config.clothing);
  if (config.eyes) params.append('eyes', config.eyes);
  
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}&${params.toString()}`;
}

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
            bio: 'Establishing my presence in the mesh.',
            followers: [],
            following: []
          };
          
          // Store public profile in the global registry
          mesh.users.get(alias).put({
            ...newUser,
            following: JSON.stringify([]),
            followers: JSON.stringify([])
          });
          
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
            const profile = data ? { 
              ...data,
              following: safeParse(data.following, []),
              followers: safeParse(data.followers, [])
            } : {
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

  getGlobalFeed(callback: (posts: Post[]) => void) {
    const postsMap = new Map<string, Post>();
    mesh.posts.map().on((data: any, id: string) => {
      if (!data) return;
      try {
        const post: Post = {
          ...data,
          author: safeParse(data.author, { name: 'Unknown', avatar: '', role: 'Artist' }),
          comments: safeParse(data.comments, []),
          likedBy: safeParse(data.likedBy, [])
        };
        postsMap.set(id, post);
        const sorted = Array.from(postsMap.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // SYNC CACHE: Update local cache whenever global feed updates
        _cachedPosts = sorted;
        callback(sorted);
      } catch (e) {}
    });
  },

  // Added missing getPosts method to filter posts by user ID from cache
  getPosts(userId: string): Post[] {
    return _cachedPosts.filter(p => p.author && p.author.id === userId);
  },

  savePost(post: Post) {
    const flatPost: any = {
      id: post.id,
      type: post.type,
      visibility: post.visibility,
      caption: post.caption || '',
      createdAt: post.createdAt,
      likes: post.likes || 0,
      rating: post.rating || 5,
      author: JSON.stringify(post.author),
      comments: JSON.stringify(post.comments || []),
      likedBy: JSON.stringify(post.likedBy || [])
    };
    if (post.imageUrl) flatPost.imageUrl = post.imageUrl;
    if (post.videoUrl) flatPost.videoUrl = post.videoUrl;
    if (post.audioUrl) flatPost.audioUrl = post.audioUrl;
    if (post.deadline) flatPost.deadline = post.deadline;

    mesh.posts.get(post.id).put(flatPost);
  },

  saveComment(postId: string, comment: Comment) {
    mesh.posts.get(postId).get('comments').once((data: any) => {
      const comments = safeParse(data, []);
      comments.push(comment);
      mesh.posts.get(postId).get('comments').put(JSON.stringify(comments));
    });
  },

  async toggleLike(postId: string, userId: string) {
    mesh.posts.get(postId).once((data: any) => {
      if (!data) return;
      const likedBy = safeParse(data.likedBy, []);
      const index = likedBy.indexOf(userId);
      if (index > -1) {
        likedBy.splice(index, 1);
      } else {
        likedBy.push(userId);
      }
      mesh.posts.get(postId).put({
        likedBy: JSON.stringify(likedBy),
        likes: likedBy.length
      });
    });
  },

  getAllArtists(callback: (users: User[]) => void) {
    const usersMap = new Map<string, User>();
    mesh.users.map().on((data: any, name: string) => {
      if (data && data.name) {
        usersMap.set(name, {
          ...data,
          following: safeParse(data.following, []),
          followers: safeParse(data.followers, [])
        });
        callback(Array.from(usersMap.values()));
      }
    });
  },

  async followUser(currentUser: User, targetHandle: string) {
    const alias = targetHandle.startsWith('@') ? targetHandle.slice(1) : targetHandle;
    return new Promise<User | null>((resolve) => {
      mesh.users.get(alias).once((target: any) => {
        if (!target || !target.name) {
          resolve(null);
          return;
        }

        // Update Following
        const following = safeParse(currentUser.following, []);
        if (!following.includes(alias)) {
          following.push(alias);
          mesh.users.get(currentUser.name).get('following').put(JSON.stringify(following));
          this.setSession({ ...currentUser, following });
        }

        // Update Followers
        const followers = safeParse(target.followers, []);
        if (!followers.includes(currentUser.name)) {
          followers.push(currentUser.name);
          mesh.users.get(alias).get('followers').put(JSON.stringify(followers));
        }

        resolve({
          ...target,
          following: safeParse(target.following, []),
          followers: safeParse(target.followers, [])
        });
      });
    });
  },

  saveUser(userData: User) {
    const data = {
      ...userData,
      following: JSON.stringify(userData.following || []),
      followers: JSON.stringify(userData.followers || [])
    };
    this.setSession(userData);
    mesh.users.get(userData.name).put(data);
  },

  getTheme(): AppTheme {
    return (localStorage.getItem(THEME_KEY) as AppTheme) || 'sanctuary';
  },

  saveTheme(theme: AppTheme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  // Added missing exportWorkspace method
  exportWorkspace() {
    const session = this.getSession();
    const data = {
      session: session,
      theme: this.getTheme(),
      chats: session ? this.getChats(session.id) : []
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse-workspace-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Added missing importWorkspace method
  importWorkspace(content: string): boolean {
    try {
      const data = JSON.parse(content);
      if (data.session) {
        this.setSession(data.session);
        if (data.chats) this.saveChats(data.session.id, data.chats);
      }
      if (data.theme) this.saveTheme(data.theme);
      return true;
    } catch (e) {
      console.error("Import Workspace Error:", e);
      return false;
    }
  },

  // Decentralized Chat Implementation
  subscribeToChats(userId: string, callback: (chats: Chat[]) => void) {
    mesh.chats.get(userId).map().on((chatData: any) => {
      // This is a simplified P2P chat fetch
      const chats = this.getChats(userId);
      callback(chats);
    });
  },

  getChats(userId: string): Chat[] {
    const data = localStorage.getItem(`chats_v2_${userId}`);
    return data ? JSON.parse(data) : [];
  },

  saveChats(userId: string, chats: Chat[]) {
    localStorage.setItem(`chats_v2_${userId}`, JSON.stringify(chats));
    // Mirror to GunDB for cloud persistence across devices
    mesh.chats.get(userId).put(JSON.stringify(chats));
  },

  sendMessage(chatId: string, message: Message): Chat[] {
    const me = this.getSession();
    if (!me) return [];
    const chats = this.getChats(me.id);
    const updated = chats.map(c => {
      if (c.id === chatId) {
        return { ...c, messages: [...c.messages, message], lastMessage: message.text };
      }
      return c;
    });
    this.saveChats(me.id, updated);
    return updated;
  },

  createChat(me: User, peer: User): Chat {
    const chats = this.getChats(me.id);
    const existing = chats.find(c => !c.isGroup && c.participants.some(p => p.name === peer.name));
    if (existing) return existing;

    const newChat: Chat = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      participants: [peer],
      messages: [],
      isGroup: false,
      lastMessage: 'Frequency aligned.'
    };
    this.saveChats(me.id, [newChat, ...chats]);
    return newChat;
  }
};
