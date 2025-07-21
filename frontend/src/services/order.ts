import { BACKEND_URL } from '@/config';

// Types (should match backend response)
export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  modifiers?: string[];
  price: number;
}
export interface Order {
  items: OrderItem[];
  total: number;
}

export async function getCurrentOrder(): Promise<Order> {
  const res = await fetch(`${BACKEND_URL}/api/order/current`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch current order');
  return res.json();
}

export async function confirmOrder(): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/order/confirm`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to confirm order');
} 