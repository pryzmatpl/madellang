import { v4 as uuidv4 } from 'uuid';
import { RoomData } from '../types';

export function createRoom(): RoomData {
  const id = uuidv4().substring(0, 8);
  const url = `${window.location.origin}?room=${id}`;
  
  return { id, url };
}

export function getRoomFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('room');
}

export function updateUrlWithRoom(roomId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  window.history.pushState({}, '', url.toString());
}