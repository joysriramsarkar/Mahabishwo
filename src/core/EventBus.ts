/**
 * Lightweight typed event bus with wildcard support.
 */
import { EventHandler, UniverseEvent } from './types';

type WildcardHandler = (event: UniverseEvent) => void;

class EventBusClass {
  private handlers: Map<string, Set<EventHandler | WildcardHandler>> = new Map();

  public on(type: '*', handler: WildcardHandler): () => void;
  public on(type: UniverseEvent['type'], handler: EventHandler): () => void;
  public on(type: string, handler: EventHandler | WildcardHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler as EventHandler);
    return () => this.off(type, handler);
  }

  public off(type: string, handler: EventHandler | WildcardHandler): void {
    this.handlers.get(type)?.delete(handler as EventHandler);
  }

  public emit(event: UniverseEvent): void {
    this.handlers.get(event.type)?.forEach((h) => (h as EventHandler)(event));
    this.handlers.get('*')?.forEach((h) => (h as WildcardHandler)(event));
  }
}

export const eventBus = new EventBusClass();
