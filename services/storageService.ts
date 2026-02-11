
import { Post, Chat, Message, AppTheme, User, AvatarConfig, Comment } from '../types';
import { gun, user, mesh, sea } from './gunService';

const THEME_KEY = 'cp_universal_v6_theme';
const SESSION_KEY = 'cp_universal_v6_session';

let _cachedGlobalPosts: Post[] = [];
let _cachedGlobalArtists: User[] = [];

const safeParse = (data: any, fallback: any) => {
  if (typeof data !== 'string') return data || fallback;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
};

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
          this.login(alias, pass).then(res => {
            if (res.user) {
              const newUser: User = {
                id: `u-${alias}`,
                name: alias,
                avatar: `https://api.dicebear.com/7.x/big-smile/svg?seed=${alias}`,
                role: 'Mesh Artist',
                joinedAt: new Date().toISOString(),
                bio: 'Universal creator.',
                followers: [],
                following: []
              };
              user.get('profile').put(newUser);
              mesh.users.get(alias).put({
                ...newUser,
                pub: user.is?.pub,
                following: JSON.stringify([]),
                followers: JSON.stringify([])
              });
            }
            resolve(res);
          });
        }
      });
    });
  },

  async login(alias: string, pass: string): Promise<{user: User | null, error?: string}> {
    return new Promise((resolve) => {
      // Set a safety timeout for auth to prevent infinite loading
      const timeout = setTimeout(() => {
        resolve({ user: null, error: "Mesh connection timed out. Try again." });
      }, 15000);

      user.auth(alias, pass, (ack: any) => {
        clearTimeout(timeout);
        if (ack.err) {
          resolve({ user: null, error: ack.err });
        } else {
          // Fetch profile but don't hang if it's not found yet
          user.get('profile').once((data: any) => {
            const profile = data ? { 
              ...data,
              following: safeParse(data.following, []),
              followers: safeParse(data.followers, [])
            } : {
              id: `u-${alias}`,
              name: alias,
              avatar: `https://api.dicebear.com/7.x/big-smile/svg?seed=${alias}`,
              role: 'Mesh Artist',
              joinedAt: new Date().toISOString(),
              bio: 'Restored from mesh.'
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
          author: safeParse(data.author, { name: 'Anonymous', avatar: '', role: 'Mesh Entity' }),
          comments: safeParse(data.comments, []),
          likedBy: safeParse(data.likedBy, [])
        };
        postsMap.set(id, post);
        const sorted = Array.from(postsMap.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        _cachedGlobalPosts = sorted;
        callback(sorted);
      } catch (e) {}
    });
  },

  getPosts(userId: string): Post[] {
    return _cachedGlobalPosts.filter(p => p.author && p.author.id === userId);
  },

  async savePost(post: Post) {
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

    return new Promise((resolve) => {
      mesh.posts.get(post.id).put(flatPost, (ack: any) => {
        resolve(ack);
      });
    });
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
        const u = {
          ...data,
          following: safeParse(data.following, []),
          followers: safeParse(data.followers, [])
        };
        usersMap.set(name, u);
        const artists = Array.from(usersMap.values());
        _cachedGlobalArtists = artists;
        callback(artists);
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
        const following = safeParse(currentUser.following, []);
        if (!following.includes(alias)) {
          following.push(alias);
          user.get('profile').get('following').put(JSON.stringify(following));
          mesh.users.get(currentUser.name).get('following').put(JSON.stringify(following));
          this.setSession({ ...currentUser, following });
        }
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
    user.get('profile').put(data);
    mesh.users.get(userData.name).put(data);
  },

  getTheme(): AppTheme {
    return (localStorage.getItem(THEME_KEY) as AppTheme) || 'sanctuary';
  },

  saveTheme(theme: AppTheme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  getChats(userId: string): Chat[] {
    const data = localStorage.getItem(`chats_universal_v6_${userId}`);
    return data ? JSON.parse(data) : [];
  },

  saveChats(userId: string, chats: Chat[]) {
    localStorage.setItem(`chats_universal_v6_${userId}`, JSON.stringify(chats));
    mesh.chats.get(userId).put(JSON.stringify(chats));
  },

  exportWorkspace() {
    const me = this.getSession();
    const data = {
      profile: me,
      theme: this.getTheme(),
      chats: me ? this.getChats(me.id) : []
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse_v6_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importWorkspace(content: string): boolean {
    try {
      const data = JSON.parse(content);
      if (data.profile) {
        this.saveUser(data.profile);
        if (data.theme) this.saveTheme(data.theme);
        if (data.chats) this.saveChats(data.profile.id, data.chats);
        return true;
      }
      return false;
    } catch (e) { return false; }
  },

  sendMessage(chatId: string, message: Message): Chat[] {
    const me = this.getSession();
    if (!me) return [];
    const chats = this.getChats(me.id);
    const updated = chats.map(c => {
      if (c.id === chatId) return { ...c, messages: [...c.messages, message], lastMessage: message.text };
      return c;
    });
    this.saveChats(me.id, updated);
    return updated;
  }
};
