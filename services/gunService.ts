
declare var Gun: any;

const relays = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://peer.wall.org/gun',
  'https://gundb.eric.ovh/gun'
];

// Initialize Gun with public relays
export const gun = Gun({
  peers: relays
});

export const user = gun.user().recall({ sessionStorage: true });

export const mesh = {
  posts: gun.get('cp_v1_global_posts'),
  users: gun.get('cp_v1_global_users'),
  chats: gun.get('cp_v1_global_chats')
};
