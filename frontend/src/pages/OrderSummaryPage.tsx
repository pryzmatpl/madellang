import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentOrder, confirmOrder } from '@/services/order';
import { useState } from 'react';

// Define types if not present
interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  modifiers?: string[];
  price: number;
}
interface Order {
  items: OrderItem[];
  total: number;
}

const OrderSummaryPage = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useQuery<Order, Error>(['order', 'current'], getCurrentOrder);
  const confirmMutation = useMutation({
    mutationFn: confirmOrder,
    onSuccess: () => navigate('/confirmation'),
    onError: (err: any) => setErrorMsg(err?.message || 'Failed to confirm order'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="text-lg">Loading order summary...</span>
      </div>
    );
  }
  if (error || errorMsg) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen space-y-4">
        <span className="text-destructive text-lg">{error?.message || errorMsg || 'Failed to load order.'}</span>
        <Button onClick={() => { setErrorMsg(null); refetch(); }}>Retry</Button>
      </div>
    );
  }
  if (!data || !data.items.length) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen space-y-4">
        <span className="text-lg">No items in your order.</span>
        <Button onClick={() => navigate('/order')}>Start Order</Button>
      </div>
    );
  }
  return (
    <div className="flex justify-center items-center min-h-screen animate-fade-in">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {data.items.map(item => (
              <li key={item.id} className="border-b pb-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{item.quantity}x {item.name}</span>
                  <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="text-sm text-muted-foreground ml-4">{item.modifiers.join(', ')}</div>
                )}
              </li>
            ))}
          </ul>
          <div className="flex justify-between mt-6 text-lg font-bold">
            <span>Total</span>
            <span>${data.total.toFixed(2)}</span>
          </div>
        </CardContent>
        <CardFooter className="flex gap-4 justify-end">
          <Button variant="outline" onClick={() => navigate('/order')}>Modify Order</Button>
          <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isLoading}>
            {confirmMutation.isLoading ? 'Confirming...' : 'Confirm Order'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OrderSummaryPage; 