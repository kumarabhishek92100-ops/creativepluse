
declare var Gun: any;

// Public P2P relays to ensure global connectivity without a dedicated server
const relays = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://peer.wall.org/gun',
  'https://gundb.eric.ovh/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://dweb.link/gun'
];

export const gun = Gun({
  peers: relays,
  localStorage: true
});

// SEA provides Security, Encryption, and Authorization
export const sea = Gun.SEA;
export const user = gun.user().recall({ sessionStorage: true });

// Global data namespaces
export const mesh = {
  posts: gun.get('cp_v4_global_posts'),
  users: gun.get('cp_v4_global_users'),
  presence: gun.get('cp_v4_presence_mesh'),
  chats: gun.get('cp_v4_encrypted_chats')
};
