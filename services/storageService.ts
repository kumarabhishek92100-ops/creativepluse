
import { Post, Chat, Message, AppTheme, User, AvatarConfig } from '../types';

// We simulate the P2P backbone using a shared registry in this environment 
// but structured for easy transition to a real P2P relay like GunDB or Firebase.
const REGISTRY_KEY = 'cp_universal_v1_registry';
const SESSION_KEY = 'cp_universal_v1_session';
const THEME_KEY = 'cp_universal_v1_theme';

async function hashPassword(password: string) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const getAvatarUrl = (config: AvatarConfig, seed: string) => {
  const params = new URLSearchParams();
  Object.entries(config || {}).forEach(([key, val]) => {
    if (val) params.append(key, val);
  });
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&${params.toString()}`;
};

export const storage = {
  // To make this "Universal", we simulate a central cloud registry 
  // In a production app, this would be an API call to a database.
  _getGlobalRegistry(): any {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) || '{}');
  },

  _saveGlobalRegistry(registry: any) {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
    // Trigger a storage event for other tabs to hear
    window.dispatchEvent(new Event('storage'));
  },

  async createAccount(name: string, pass: string): Promise<{user: User, error?: string}> {
    const registry = this._getGlobalRegistry();
    const alias = name.toLowerCase().trim();
    if (registry[alias]) return { user: null as any, error: "Alias already claimed globally." };
    
    const id = `u-${Math.random().toString(36).substr(2, 9)}`;
    const passHash = await hashPassword(pass);
    
    const newUser: User = {
      id,
      name: name.trim(),
      avatar: `https://api.dicebear.com/7.x/big-smile/svg?seed=${id}`,
      role: 'Global Creator',
      joinedAt: new Date().toISOString(),
      bio: 'Joined the universal pulse.',
      followers: [],
      following: []
    };

    registry[alias] = {
      user: newUser,
      passHash,
      posts: [],
      chats: []
    };

    this._saveGlobalRegistry(registry);
    this.setSession(newUser);
    return { user: newUser };
  },

  async login(name: string, pass: string): Promise<{user: User | null, error?: string}> {
    const registry = this._getGlobalRegistry();
    const alias = name.toLowerCase().trim();
    const account = registry[alias];
    
    if (!account) return { user: null, error: "Identity not found in the pulse." };
    
    const passHash = await hashPassword(pass);
    if (account.passHash !== passHash) return { user: null, error: "Invalid private key." };
    
    this.setSession(account.user);
    return { user: account.user };
  },

  // Use standard methods instead of arrow functions to ensure correct 'this' context
  setSession(user: User) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
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
    localStorage.removeItem(SESSION_KEY);
  },

  _getAccount(userId: string) {
    const registry = this._getGlobalRegistry();
    return Object.values(registry).find((a: any) => a.user.id === userId) as any;
  },

  _updateAccount(userId: string, updates: any) {
    const registry = this._getGlobalRegistry();
    const alias = Object.keys(registry).find(k => registry[k].user.id === userId);
    if (alias) {
      registry[alias] = { ...registry[alias], ...updates };
      this._saveGlobalRegistry(registry);
    }
  },

  getGlobalFeed(): Post[] {
    const registry = this._getGlobalRegistry();
    const currentUser = this.getSession();
    let allPosts: Post[] = [];
    
    Object.values(registry).forEach((acc: any) => {
      if (acc.posts) {
        acc.posts.forEach((post: Post) => {
          const isOwn = currentUser && post.author.id === currentUser.id;
          const isPublic = post.visibility === 'public';
          const isFollowing = currentUser && currentUser.following?.includes(post.author.id);
          
          if (isOwn || isPublic || isFollowing) {
            allPosts.push(post);
          }
        });
      }
    });

    return allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id.localeCompare(a.id));
  },

  savePost(userId: string, post: Post) {
    const acc = this._getAccount(userId);
    if (acc) {
      const posts = [post, ...(acc.posts || [])];
      this._updateAccount(userId, { posts });
    }
  },

  getPosts(userId: string): Post[] {
    const acc = this._getAccount(userId);
    return acc ? (acc.posts || []) : [];
  },

  getAllArtists(): User[] {
    const registry = this._getGlobalRegistry();
    return Object.values(registry).map((acc: any) => acc.user);
  },

  toggleFollow(currentUserId: string, targetUserId: string) {
    const currentAcc = this._getAccount(currentUserId);
    const targetAcc = this._getAccount(targetUserId);
    // Added safety checks for account and user objects to resolve 'possibly undefined' errors
    if (!currentAcc || !targetAcc || !currentAcc.user || !targetAcc.user) return;

    let following: string[] = currentAcc.user.following || [];
    let followers: string[] = targetAcc.user.followers || [];

    if (following.includes(targetUserId)) {
      following = following.filter((id: string) => id !== targetUserId);
      followers = followers.filter((id: string) => id !== currentUserId);
    } else {
      following = [...following, targetUserId];
      followers = [...followers, currentUserId];
    }

    this._updateAccount(currentUserId, { user: { ...currentAcc.user, following } });
    this._updateAccount(targetUserId, { user: { ...targetAcc.user, followers } });
    
    const session = this.getSession();
    if (session && session.id === currentUserId) {
      this.setSession({ ...session, following });
    }
  },

  getTheme(): AppTheme {
    return (localStorage.getItem(THEME_KEY) as AppTheme) || 'sanctuary';
  },

  saveTheme(theme: AppTheme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  saveUser(user: User) {
    this.setSession(user);
    this._updateAccount(user.id, { user });
  },

  getChats(userId: string): Chat[] {
    return this._getAccount(userId)?.chats || [];
  },

  saveChats(userId: string, chats: Chat[]) {
    this._updateAccount(userId, { chats });
  },

  sendMessage(chatId: string, message: Message): Chat[] {
    const user = this.getSession();
    if (!user) return [];
    const acc = this._getAccount(user.id);
    if (!acc) return [];
    
    const chats = (acc.chats || []).map((c: Chat) => {
      if (c.id === chatId) {
        return {
          ...c,
          messages: [...c.messages, message],
          lastMessage: message.text
        };
      }
      return c;
    });
    
    this._updateAccount(user.id, { chats });
    return chats;
  },

  exportWorkspace() {
    const registry = this._getGlobalRegistry();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registry));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "pulse_workspace_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  },

  importWorkspace(content: string): boolean {
    try {
      const registry = JSON.parse(content);
      if (typeof registry !== 'object' || registry === null) return false;
      this._saveGlobalRegistry(registry);
      return true;
    } catch (e) {
      return false;
    }
  }
};
