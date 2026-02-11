
declare var Gun: any;

// Public P2P relays to ensure global connectivity across different ISPs and networks
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

export const gun = Gun({
  peers: relays,
  localStorage: true,
  radisk: true // Enable advanced P2P storage
});

// SEA provides Security, Encryption, and Authorization
export const sea = Gun.SEA;
export const user = gun.user().recall({ sessionStorage: true });

// Global data namespaces - Version 4 Mesh
export const mesh = {
  posts: gun.get('cp_v4_universal_posts'),
  users: gun.get('cp_v4_universal_users'),
  presence: gun.get('cp_v4_universal_presence'),
  chats: gun.get('cp_v4_universal_chats_v2')
};
