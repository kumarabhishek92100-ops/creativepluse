
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import PostCard from './components/PostCard';
import Room from './components/Room';
import CreatePost from './components/CreatePost';
import ChatView from './components/ChatView';
import ProfileView from './components/ProfileView';
import AuthView from './components/AuthView';
import DiscoveryView from './components/DiscoveryView';
import ManifestoView from './components/ManifestoView';
import NotificationToast from './components/NotificationToast';
import { Post, AppView, User, PulseNotification } from './types';
import { storage } from './services/storageService';
import { realtime } from './services/realtimeService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('feed');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [globalPosts, setGlobalPosts] = useState<Post[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [notifications, setNotifications] = useState<PulseNotification[]>([]);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'syncing' | 'offline'>('online');

  useEffect(() => {
    const session = storage.getSession();
    setCurrentUser(session);
    
    // Subscribe to Global Real-time Feed
    storage.getGlobalFeed((posts) => {
      setGlobalPosts(posts);
      setNetworkStatus('online');
    });
    
    const theme = storage.getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    setIsReady(true);

    return () => {};
  }, []);

  const handleLogout = () => {
    storage.logout();
    setCurrentUser(null);
    setView('feed');
  };

  const navigateToUser = (uid: string) => {
    if (currentUser && uid === currentUser.id) {
      setView('profile');
    } else {
      setSelectedUserId(uid);
      setView('other-profile');
    }
  };

  if (!isReady) return null;

  if (!currentUser) {
    return <AuthView onAuthSuccess={(user) => {
      setCurrentUser(user);
    }} />;
  }

  return (
    <Layout activeView={view} setActiveView={setView} onLogout={handleLogout}>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] pointer-events-none">
        <div className={`px-4 py-1.5 rounded-full border-2 border-[var(--border)] bg-[var(--card-bg)] shadow-xl flex items-center gap-3 transition-all duration-500 ${networkStatus === 'syncing' ? 'scale-110' : 'scale-100 opacity-60 hover:opacity-100'}`}>
          <div className={`w-2 h-2 rounded-full ${networkStatus === 'online' ? 'bg-green-500' : 'bg-amber-500 animate-ping'}`}></div>
          <span className="text-[8px] font-bold uppercase tracking-widest">
            {networkStatus === 'online' ? 'Global Mesh Connected' : 'Syncing...'}
          </span>
        </div>
      </div>

      <div className="fixed top-24 right-6 z-[300] space-y-3 pointer-events-none">
        {notifications.map(n => (
          <NotificationToast key={n.id} notification={n} onDismiss={(id) => setNotifications(prev => prev.filter(x => x.id !== id))} />
        ))}
      </div>

      {view === 'feed' && (
        <div className="max-w-3xl mx-auto py-12 md:py-20 px-6 animate-fade-in">
          <header className="mb-12">
            <div className="flex items-center justify-between">
              <div className="bg-[var(--primary)] text-white p-4 chunky-card !shadow-none !border-0 rotate-[-1deg] inline-block mb-3">
                 <h2 className="text-3xl md:text-5xl font-display leading-none uppercase tracking-tight">Global.</h2>
              </div>
            </div>
          </header>
          
          <div className="space-y-16 pb-32">
            {globalPosts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                onUpdate={(up) => {
                  storage.savePost(up);
                }}
                onUserClick={navigateToUser}
              />
            ))}
            {globalPosts.length === 0 && (
              <div className="py-32 text-center opacity-20 italic">
                 Searching the global pulse...
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'discovery' && (
        <DiscoveryView currentUser={currentUser} onArtistClick={navigateToUser} />
      )}

      {view === 'calendar' && <ManifestoView currentUser={currentUser} />}

      {view === 'chat' && <ChatView currentUser={currentUser} />}
      {view === 'room' && <Room onExit={() => setView('feed')} />}
      {view === 'create' && <CreatePost onPublish={(data) => {
        const newPost: Post = {
          ...data,
          id: `p-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
          author: currentUser,
          likes: 0,
          likedBy: [],
          rating: 5,
          comments: [],
          createdAt: new Date().toISOString()
        };
        storage.savePost(newPost);
        setView('feed');
      }} />}
      
      {view === 'profile' && <ProfileView userId={currentUser.id} isOwn={true} />}

      {view === 'other-profile' && selectedUserId && (
        <ProfileView userId={selectedUserId} isOwn={false} onClose={() => setView('feed')} />
      )}
    </Layout>
  );
};

export default App;
