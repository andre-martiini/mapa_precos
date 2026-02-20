import { Process, Item, Quote } from './types';

export const storage = {
  // Processes
  async getProcesses(): Promise<Process[]> {
    const res = await fetch('/api/processes');
    if (!res.ok) throw new Error('Failed to fetch processes');
    return res.json();
  },

  async getProcess(id: number): Promise<Process> {
    const res = await fetch(`/api/processes/${id}`);
    if (!res.ok) throw new Error('Failed to fetch process');
    return res.json();
  },

  async createProcess(process: { process_number: string, object: string }): Promise<{ id: number }> {
    const res = await fetch('/api/processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(process)
    });
    if (!res.ok) throw new Error('Failed to create process');
    return res.json();
  },

  async updateProcess(id: number, process: { process_number: string, object: string }): Promise<void> {
    const res = await fetch(`/api/processes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(process)
    });
    if (!res.ok) throw new Error('Failed to update process');
  },

  async deleteProcess(id: number): Promise<void> {
    const res = await fetch(`/api/processes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete process');
  },

  // Items
  async getItems(processId: number): Promise<Item[]> {
    const res = await fetch(`/api/processes/${processId}/items`);
    if (!res.ok) throw new Error('Failed to fetch items');
    return res.json();
  },

  async createItem(processId: number, item: Omit<Item, 'id' | 'process_id'>): Promise<{ id: number }> {
    const res = await fetch(`/api/processes/${processId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error('Failed to create item');
    return res.json();
  },

  async updateItem(id: number, item: Omit<Item, 'id' | 'process_id'>): Promise<void> {
    const res = await fetch(`/api/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error('Failed to update item');
  },

  async deleteItem(id: number): Promise<void> {
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete item');
  },

  // Quotes
  async getQuotes(itemId: number): Promise<Quote[]> {
    const res = await fetch(`/api/items/${itemId}/quotes`);
    if (!res.ok) throw new Error('Failed to fetch quotes');
    return res.json();
  },

  async createQuote(itemId: number, quote: Omit<Quote, 'id' | 'item_id'>): Promise<{ id: number }> {
    const res = await fetch(`/api/items/${itemId}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quote)
    });
    if (!res.ok) throw new Error('Failed to create quote');
    return res.json();
  },

  async updateQuote(id: number, quote: Omit<Quote, 'id' | 'item_id'>): Promise<void> {
    const res = await fetch(`/api/quotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quote)
    });
    if (!res.ok) throw new Error('Failed to update quote');
  },

  async deleteQuote(id: number): Promise<void> {
    const res = await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete quote');
  },

  async batchCreateItems(processId: number, items: any[]): Promise<void> {
    const res = await fetch(`/api/processes/${processId}/items/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    if (!res.ok) throw new Error('Failed to batch create items');
  },

  async batchCreateQuotes(itemId: number, quotes: any[]): Promise<void> {
    const res = await fetch(`/api/items/${itemId}/quotes/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotes })
    });
    if (!res.ok) throw new Error('Failed to batch create quotes');
  },

  // History
  async getHistory(): Promise<(Item & { process_number: string, object: string })[]> {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  }
};
