
declare var Gun: any;

/**
 * Robust global relays. These act as the glue for P2P connections
 * across different networks and Vercel deployments.
 */
const relays = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://peer.wall.org/gun',
  'https://gundb.eric.ovh/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://dweb.link/gun',
  'https://gunjs.herokuapp.com/gun',
  'https://gun-sjc.herokuapp.com/gun'
];

// Re-enable localStorage: It makes the app usable offline and much faster on startup
export const gun = Gun({
  peers: relays,
  localStorage: true, 
  radisk: true,
  indexedDB: true
});

// SEA provides Security, Encryption, and Authorization
export const sea = Gun.SEA;

/**
 * Recall the session to keep users logged in across refreshes.
 */
export const user = gun.user().recall({ sessionStorage: true });

// Universal Mesh Namespace - V6
export const mesh = {
  posts: gun.get('cp_v6_mesh_posts'),
  users: gun.get('cp_v6_mesh_users'),
  presence: gun.get('cp_v6_mesh_presence'),
  chats: gun.get('cp_v6_mesh_chats')
};

export const getPeerCount = () => {
  try {
    return Object.keys(gun._.opt.peers).length;
  } catch (e) {
    return 0;
  }
};
