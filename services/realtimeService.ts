
type RealtimeCallback = (data: any) => void;

class RealtimeEngine {
  private channel: BroadcastChannel;
  private listeners: Set<RealtimeCallback> = new Set();
  private instanceId: string;

  constructor() {
    this.instanceId = Math.random().toString(36).substr(2, 9);
    this.channel = new BroadcastChannel('cp_realtime_v8');
    this.channel.onmessage = (event) => {
      // If it's from another tab, mark it as remote
      const isRemote = event.data.instanceId !== this.instanceId;
      this.listeners.forEach(cb => cb({ ...event.data, sender: isRemote ? 'remote' : 'local' }));
    };
  }

  send(type: string, payload: any) {
    const message = { type, payload, instanceId: this.instanceId, timestamp: Date.now() };
    this.channel.postMessage(message);
    // Also notify current tab's listeners so state updates immediately
    this.listeners.forEach(cb => cb({ ...message, sender: 'local' }));
  }

  subscribe(callback: RealtimeCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export const realtime = new RealtimeEngine();
