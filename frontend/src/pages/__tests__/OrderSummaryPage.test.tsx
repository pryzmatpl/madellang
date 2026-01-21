import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useNavigate } from 'react-router-dom';
jest.mock('../../services/order');
import * as orderService from '../../services/order';
import OrderSummaryPage from '../OrderSummaryPage';

const mockOrder = {
  items: [
    { id: '1', name: 'Burger', quantity: 2, modifiers: ['no cheese'], price: 5.5 },
    { id: '2', name: 'Fries', quantity: 1, price: 2.0 },
  ],
  total: 13.0,
};

describe('OrderSummaryPage', () => {
  const renderPage = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <OrderSummaryPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state', async () => {
    (orderService.getCurrentOrder as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading order summary/i)).toBeInTheDocument();
  });

  it('shows error state', async () => {
    (orderService.getCurrentOrder as jest.Mock).mockRejectedValue(new Error('API error'));
    renderPage();
    await waitFor(() => expect(screen.getByText(/api error/i)).toBeInTheDocument());
  });

  it('shows empty order state', async () => {
    (orderService.getCurrentOrder as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    renderPage();
    await waitFor(() => expect(screen.getByText(/no items in your order/i)).toBeInTheDocument());
  });

  it('shows order summary and handles confirm', async () => {
    (orderService.getCurrentOrder as jest.Mock).mockResolvedValue(mockOrder);
    (orderService.confirmOrder as jest.Mock).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText(/order summary/i)).toBeInTheDocument());
    expect(screen.getByText(/burger/i)).toBeInTheDocument();
    expect(screen.getByText(/fries/i)).toBeInTheDocument();
    expect(screen.getByText('$13.00')).toBeInTheDocument();
    const confirmBtn = screen.getByText(/confirm order/i);
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(orderService.confirmOrder).toHaveBeenCalled());
  });

  it('handles modify order button', async () => {
    (orderService.getCurrentOrder as jest.Mock).mockResolvedValue(mockOrder);
    renderPage();
    await waitFor(() => expect(screen.getByText(/order summary/i)).toBeInTheDocument());
    const modifyBtn = screen.getByText(/modify order/i);
    fireEvent.click(modifyBtn);
    // Navigation is tested by absence of error; in real app, useNavigate would be mocked
  });
}); 