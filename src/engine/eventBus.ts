import { CollisionEvent } from './types';

export type CollisionEventListener = (event: CollisionEvent) => void;

export class PhysicsEventBus {
  private listeners: CollisionEventListener[] = [];
  private eventLog: CollisionEvent[] = [];

  subscribe(listener: CollisionEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(event: CollisionEvent): void {
    this.eventLog.push(event);
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i](event);
    }
  }

  getEventLog(): CollisionEvent[] {
    return this.eventLog;
  }

  clearLog(): void {
    this.eventLog = [];
  }
}
