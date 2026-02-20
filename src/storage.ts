import { Process, Item, Quote } from './types';

const STORAGE_KEYS = {
  PROCESSES: 'mapapro_processes',
  ITEMS: 'mapapro_items',
  QUOTES: 'mapapro_quotes'
};

const getStorage = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveStorage = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const storage = {
  // Processes
  async getProcesses(): Promise<Process[]> {
    return getStorage<Process>(STORAGE_KEYS.PROCESSES).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async createProcess(process: { process_number: string, object: string }): Promise<{ id: number }> {
    const processes = getStorage<Process>(STORAGE_KEYS.PROCESSES);
    const newProcess: Process = {
      ...process,
      id: Date.now(),
      created_at: new Date().toISOString()
    };
    processes.push(newProcess);
    saveStorage(STORAGE_KEYS.PROCESSES, processes);
    return { id: newProcess.id };
  },

  async deleteProcess(id: number): Promise<void> {
    const processes = getStorage<Process>(STORAGE_KEYS.PROCESSES).filter(p => p.id !== id);
    saveStorage(STORAGE_KEYS.PROCESSES, processes);

    // Cascading delete items and quotes
    const items = getStorage<Item>(STORAGE_KEYS.ITEMS);
    const itemsToDelete = items.filter(it => it.process_id === id);
    const remainingItems = items.filter(it => it.process_id !== id);
    saveStorage(STORAGE_KEYS.ITEMS, remainingItems);

    const quotes = getStorage<Quote>(STORAGE_KEYS.QUOTES);
    const itemIdsToDelete = new Set(itemsToDelete.map(it => it.id));
    const remainingQuotes = quotes.filter(q => !itemIdsToDelete.has(q.item_id));
    saveStorage(STORAGE_KEYS.QUOTES, remainingQuotes);
  },

  // Items
  async getItems(processId: number): Promise<Item[]> {
    return getStorage<Item>(STORAGE_KEYS.ITEMS)
      .filter(it => it.process_id === processId)
      .sort((a, b) => a.item_number - b.item_number);
  },

  async createItem(processId: number, item: Omit<Item, 'id' | 'process_id'>): Promise<{ id: number }> {
    const items = getStorage<Item>(STORAGE_KEYS.ITEMS);
    const newItem: Item = {
      ...item,
      id: Date.now() + Math.floor(Math.random() * 1000),
      process_id: processId
    };
    items.push(newItem);
    saveStorage(STORAGE_KEYS.ITEMS, items);
    return { id: newItem.id };
  },

  async updateItem(id: number, item: Omit<Item, 'id' | 'process_id'>): Promise<void> {
    const items = getStorage<Item>(STORAGE_KEYS.ITEMS);
    const index = items.findIndex(it => it.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...item };
      saveStorage(STORAGE_KEYS.ITEMS, items);
    }
  },

  async deleteItem(id: number): Promise<void> {
    const items = getStorage<Item>(STORAGE_KEYS.ITEMS).filter(it => it.id !== id);
    saveStorage(STORAGE_KEYS.ITEMS, items);

    // Cascading delete quotes
    const quotes = getStorage<Quote>(STORAGE_KEYS.QUOTES).filter(q => q.item_id !== id);
    saveStorage(STORAGE_KEYS.QUOTES, quotes);
  },

  // Quotes
  async getQuotes(itemId: number): Promise<Quote[]> {
    return getStorage<Quote>(STORAGE_KEYS.QUOTES)
      .filter(q => q.item_id === itemId)
      .sort((a, b) => new Date(b.quote_date).getTime() - new Date(a.quote_date).getTime());
  },

  async createQuote(itemId: number, quote: Omit<Quote, 'id' | 'item_id'>): Promise<{ id: number }> {
    const quotes = getStorage<Quote>(STORAGE_KEYS.QUOTES);
    const newQuote: Quote = {
      ...quote,
      id: Date.now() + Math.floor(Math.random() * 1000),
      item_id: itemId
    };
    quotes.push(newQuote);
    saveStorage(STORAGE_KEYS.QUOTES, quotes);
    return { id: newQuote.id };
  },

  async updateQuote(id: number, quote: Omit<Quote, 'id' | 'item_id'>): Promise<void> {
    const quotes = getStorage<Quote>(STORAGE_KEYS.QUOTES);
    const index = quotes.findIndex(q => q.id === id);
    if (index !== -1) {
      quotes[index] = { ...quotes[index], ...quote };
      saveStorage(STORAGE_KEYS.QUOTES, quotes);
    }
  },

  async deleteQuote(id: number): Promise<void> {
    const quotes = getStorage<Quote>(STORAGE_KEYS.QUOTES).filter(q => q.id !== id);
    saveStorage(STORAGE_KEYS.QUOTES, quotes);
  },

  // History
  async getHistory(): Promise<(Item & { process_number: string, object: string })[]> {
    const items = getStorage<Item>(STORAGE_KEYS.ITEMS);
    const processes = getStorage<Process>(STORAGE_KEYS.PROCESSES);

    return items.map(item => {
      const process = processes.find(p => p.id === item.process_id);
      return {
        ...item,
        process_number: process?.process_number || '',
        object: process?.object || ''
      };
    }).sort((a, b) => {
      const procA = processes.find(p => p.id === a.process_id);
      const procB = processes.find(p => p.id === b.process_id);
      return new Date(procB?.created_at || 0).getTime() - new Date(procA?.created_at || 0).getTime();
    });
  }
};
