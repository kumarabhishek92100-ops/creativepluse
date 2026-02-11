
/**
 * GUN_SERVICE_DEPRECATED
 * To resolve the "HTTPS Server Not Found" error, we have removed all GunDB calls.
 * The application now relies on a robust local-first state with manual JSON backup.
 */

const mockNode = () => {
  const node = {
    put: () => node,
    on: () => node,
    map: () => node,
    get: () => node,
    once: (cb: any) => { if(cb) cb(null); return node; }
  };
  return node;
};

export const p2p = {
  gun: null,
  posts: mockNode(),
  users: mockNode(),
  globalChat: mockNode(),
  typing: mockNode(),
  sync: () => { /* No-op to prevent errors */ }
};
