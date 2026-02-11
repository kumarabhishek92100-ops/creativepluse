
declare var Gun: any;

/**
 * These are high-availability global GunDB relays.
 * Using multiple relays ensures that even if one network (like a specific ISP or region)
 * blocks one, the P2P mesh stays connected.
 */
const relays = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://peer.wall.org/gun',
  'https://gundb.eric.ovh/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://dweb.link/gun',
  'https://gunjs.herokuapp.com/gun'
];

export const gun = Gun({
  peers: relays,
  localStorage: false, // Turn off Gun's internal localStorage to use IndexedDB/Radisk for better P2P stability
  radisk: true,
  indexedDB: true
});

// SEA provides Security, Encryption, and Authorization
export const sea = Gun.SEA;

/**
 * .recall({ sessionStorage: true }) is critical for Vercel/Web apps.
 * It allows the P2P session to persist across tab reloads without re-entering password.
 */
export const user = gun.user().recall({ sessionStorage: true });

// Global data namespaces - Version 5 Universal Mesh
export const mesh = {
  posts: gun.get('cp_v5_global_posts_final'),
  users: gun.get('cp_v5_global_users_final'),
  presence: gun.get('cp_v5_global_presence_final'),
  chats: gun.get('cp_v5_global_chats_final')
};

// Helper to track peer count
export const getPeerCount = () => {
  try {
    return Object.keys(gun._.opt.peers).length;
  } catch (e) {
    return 0;
  }
};
