import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Calculator, 
  TrendingUp, 
  AlertTriangle, 
  ChevronRight, 
  Search,
  ArrowLeft,
  Download,
  Copy,
  LayoutDashboard,
  Package,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Process, Item, Quote, Stats } from './types';
import { calculateStats, formatCurrency, formatDate } from './utils';
import { storage } from './storage';

// --- Components ---

const Card = ({ children, className = "", ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = "",
  disabled = false,
  type = 'button',
  ...props
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost',
  className?: string,
  disabled?: boolean,
  type?: 'button' | 'submit'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100'
  };

  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
    <input 
      {...props}
      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
    />
  </div>
);

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'dashboard' | 'process' | 'export' | 'history'>('dashboard');
  const [processes, setProcesses] = useState<Process[]>([]);
  const [historyItems, setHistoryItems] = useState<(Item & { process_number: string, object: string })[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [quotes, setQuotes] = useState<Record<number, Quote[]>>({});
  const [loading, setLoading] = useState(true);

  // Form states
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [newProcess, setNewProcess] = useState({ process_number: '', object: '' });
  
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [newItem, setNewItem] = useState({ item_number: 1, specification: '', unit: 'UN', quantity: 1, pricing_strategy: 'sanitized' as const });
  
  const [editingQuote, setEditingQuote] = useState<{ quote: Quote, itemId: number } | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState<number | null>(null);
  const [newQuote, setNewQuote] = useState({ source: '', quote_date: new Date().toISOString().split('T')[0], unit_price: 0, quote_type: 'private' as const });

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      const data = await storage.getProcesses();
      setProcesses(data);
    } catch (e) {
      console.error("Fetch processes failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await storage.getHistory();
      setHistoryItems(data);
      setView('history');
    } catch (e) {
      console.error("Fetch history failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessDetails = async (process: Process) => {
    setLoading(true);
    try {
      const itemsData = await storage.getItems(process.id);
      setItems(itemsData);
      
      const quotesMap: Record<number, Quote[]> = {};
      for (const item of itemsData) {
        const itemQuotes = await storage.getQuotes(item.id);
        quotesMap[item.id] = itemQuotes;
      }
      setQuotes(quotesMap);
      setSelectedProcess(process);
      setView('process');
    } catch (e) {
      console.error("Fetch process details failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await storage.createProcess(newProcess);
      fetchProcesses();
      setShowProcessModal(false);
      setNewProcess({ process_number: '', object: '' });
    } catch (e) { console.error(e); }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess) return;
    try {
      if (editingItem) {
        await storage.updateItem(editingItem.id, newItem);
      } else {
        await storage.createItem(selectedProcess.id, newItem);
      }
      fetchProcessDetails(selectedProcess);
      setShowItemModal(false);
      setEditingItem(null);
      setNewItem({ item_number: items.length + 2, specification: '', unit: 'UN', quantity: 1, pricing_strategy: 'sanitized' });
    } catch (e) { console.error(e); }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((showQuoteModal === null && !editingQuote) || !selectedProcess) return;
    try {
      if (editingQuote) {
        await storage.updateQuote(editingQuote.quote.id, newQuote);
      } else {
        await storage.createQuote(showQuoteModal!, newQuote);
      }
      fetchProcessDetails(selectedProcess);
      setShowQuoteModal(null);
      setEditingQuote(null);
      setNewQuote({ source: '', quote_date: new Date().toISOString().split('T')[0], unit_price: 0, quote_type: 'private' });
    } catch (e) { console.error(e); }
  };

  const handleDeleteProcess = async (id: number) => {
    if (!confirm('Deseja excluir este processo e todos os seus itens?')) return;
    await storage.deleteProcess(id);
    fetchProcesses();
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Deseja excluir este item?')) return;
    await storage.deleteItem(id);
    if (selectedProcess) fetchProcessDetails(selectedProcess);
  };

  const handleDeleteQuote = async (id: number) => {
    await storage.deleteQuote(id);
    if (selectedProcess) fetchProcessDetails(selectedProcess);
  };

  if (view === 'export' && selectedProcess) {
    return (
      <div className="min-h-screen bg-white p-4 max-w-[1600px] mx-auto overflow-x-auto">
        <div className="flex justify-between items-center mb-8 no-print">
          <Button variant="secondary" onClick={() => setView('process')}>
            <ArrowLeft size={18} /> Voltar
          </Button>
          <div className="flex gap-4 items-center">
            <span className="text-sm font-bold text-slate-500">Configuração Global:</span>
            <select 
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              onChange={(e) => {
                const strategy = e.target.value as any;
                setItems(items.map(it => ({ ...it, pricing_strategy: strategy })));
              }}
            >
              <option value="">Alterar todos para...</option>
              <option value="sanitized">Média Saneada</option>
              <option value="mean">Média Comum</option>
              <option value="median">Mediana</option>
            </select>
            <Button onClick={() => window.print()}>
              <Download size={18} /> Imprimir PDF
            </Button>
          </div>
        </div>

        <div className="text-center mb-8 border-b-2 border-slate-900 pb-6">
          <h1 className="text-2xl font-bold uppercase tracking-tighter mb-1">Mapa Comparativo de Preços</h1>
          <p className="text-slate-500 font-mono text-sm">Processo nº {selectedProcess.process_number}</p>
          <p className="mt-2 text-md italic serif">Objeto: {selectedProcess.object}</p>
        </div>

        <table className="w-full border-collapse border border-slate-800 text-[10px]">
          <thead>
            <tr className="bg-slate-100 uppercase font-bold text-center">
              <th className="border border-slate-800 p-1 w-8" rowSpan={2}>Item</th>
              <th className="border border-slate-800 p-1 w-48" rowSpan={2}>Especificação Sucinta</th>
              <th className="border border-slate-800 p-1 w-12" rowSpan={2}>UNID</th>
              <th className="border border-slate-800 p-1 w-12" rowSpan={2}>Quant</th>
              <th className="border border-slate-800 p-1" colSpan={3}>Preços</th>
              
              {/* Conditional Columns based on strategy */}
              {(items.some(it => it.pricing_strategy === 'median' || it.pricing_strategy === 'sanitized')) && (
                <th className="border border-slate-800 p-1" rowSpan={2}>Menor Valor Unitário</th>
              )}
              
              <th className="border border-slate-800 p-1" rowSpan={2}>Média (Unitário)</th>
              
              {(items.some(it => it.pricing_strategy === 'median' || it.pricing_strategy === 'sanitized')) && (
                <th className="border border-slate-800 p-1" rowSpan={2}>Mediana (Unitário)</th>
              )}

              {(items.some(it => it.pricing_strategy === 'sanitized')) && (
                <>
                  <th className="border border-slate-800 p-1" rowSpan={2}>Desvio Padrão</th>
                  <th className="border border-slate-800 p-1" rowSpan={2}>CV (%)</th>
                  <th className="border border-slate-800 p-1" rowSpan={2}>Limite Inferior</th>
                  <th className="border border-slate-800 p-1" rowSpan={2}>Limite Superior</th>
                  <th className="border border-slate-800 p-1" rowSpan={2}>Média Saneada</th>
                </>
              )}
              
              <th className="border border-slate-800 p-1 bg-slate-200" rowSpan={2}>Total Estimado</th>
            </tr>
            <tr className="bg-slate-100 uppercase font-bold text-center">
              <th className="border border-slate-800 p-1 min-w-[120px]">Fornecedor</th>
              <th className="border border-slate-800 p-1">Data</th>
              <th className="border border-slate-800 p-1">Vlr. Unit.</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const itemQuotes = quotes[item.id] || [];
              const stats = calculateStats(itemQuotes, item.quantity);
              const rowCount = Math.max(1, itemQuotes.length);
              
              const isSanitized = item.pricing_strategy === 'sanitized';
              const isMedian = item.pricing_strategy === 'median';
              const isMean = item.pricing_strategy === 'mean';

              let finalUnitValue = stats.sanitizedMean;
              if (isMean) finalUnitValue = stats.mean;
              if (isMedian) finalUnitValue = stats.median;
              
              const finalTotal = finalUnitValue * item.quantity;

              return (
                <React.Fragment key={item.id}>
                  {Array.from({ length: rowCount }).map((_, idx) => (
                    <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50">
                      {idx === 0 && (
                        <>
                          <td className="border border-slate-800 p-1 text-center font-bold" rowSpan={rowCount}>{item.item_number}</td>
                          <td className="border border-slate-800 p-1 align-top" rowSpan={rowCount}>{item.specification}</td>
                          <td className="border border-slate-800 p-1 text-center" rowSpan={rowCount}>{item.unit}</td>
                          <td className="border border-slate-800 p-1 text-center font-bold" rowSpan={rowCount}>{item.quantity}</td>
                        </>
                      )}
                      
                      {/* Quote Columns */}
                      <td className="border border-slate-800 p-1 min-w-[120px]">
                        {itemQuotes[idx]?.source || '-'}
                      </td>
                      <td className="border border-slate-800 p-1 text-center whitespace-nowrap">
                        {itemQuotes[idx] ? formatDate(itemQuotes[idx].quote_date) : '-'}
                      </td>
                      <td className="border border-slate-800 p-1 text-right font-mono">
                        {itemQuotes[idx] ? formatCurrency(itemQuotes[idx].unit_price) : '-'}
                      </td>

                      {idx === 0 && (
                        <>
                          {(items.some(it => it.pricing_strategy === 'median' || it.pricing_strategy === 'sanitized')) && (
                            <td className="border border-slate-800 p-1 text-right font-mono" rowSpan={rowCount}>
                              {isMedian || isSanitized ? formatCurrency(stats.min) : '-'}
                            </td>
                          )}
                          
                          <td className="border border-slate-800 p-1 text-right font-mono" rowSpan={rowCount}>
                            {formatCurrency(stats.mean)}
                          </td>
                          
                          {(items.some(it => it.pricing_strategy === 'median' || it.pricing_strategy === 'sanitized')) && (
                            <td className="border border-slate-800 p-1 text-right font-mono" rowSpan={rowCount}>
                              {isMedian || isSanitized ? formatCurrency(stats.median) : '-'}
                            </td>
                          )}

                          {(items.some(it => it.pricing_strategy === 'sanitized')) && (
                            <>
                              <td className="border border-slate-800 p-1 text-right font-mono" rowSpan={rowCount}>
                                {isSanitized ? formatCurrency(stats.stdDev) : '-'}
                              </td>
                              <td className="border border-slate-800 p-1 text-center font-mono" rowSpan={rowCount}>
                                {isSanitized ? `${stats.cv.toFixed(2)}%` : '-'}
                              </td>
                              <td className="border border-slate-800 p-1 text-right font-mono" rowSpan={rowCount}>
                                {isSanitized ? formatCurrency(stats.lowerLimit) : '-'}
                              </td>
                              <td className="border border-slate-800 p-1 text-right font-mono" rowSpan={rowCount}>
                                {isSanitized ? formatCurrency(stats.upperLimit) : '-'}
                              </td>
                              <td className="border border-slate-800 p-1 text-right font-mono" rowSpan={rowCount}>
                                {isSanitized ? formatCurrency(stats.sanitizedMean) : '-'}
                              </td>
                            </>
                          )}

                          <td className="border border-slate-800 p-1 text-right font-mono font-bold bg-slate-100" rowSpan={rowCount}>
                            {formatCurrency(finalTotal)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-bold uppercase">
              <td colSpan={items.some(it => it.pricing_strategy === 'sanitized') ? 15 : (items.some(it => it.pricing_strategy === 'median') ? 10 : 8)} className="border border-slate-800 p-2 text-right">
                Valor Total da Pesquisa:
              </td>
              <td className="border border-slate-800 p-2 text-right font-mono text-sm">
                {formatCurrency(items.reduce((acc, item) => {
                  const itemQuotes = quotes[item.id] || [];
                  const stats = calculateStats(itemQuotes, item.quantity);
                  let val = stats.sanitizedMean;
                  if (item.pricing_strategy === 'mean') val = stats.mean;
                  if (item.pricing_strategy === 'median') val = stats.median;
                  return acc + (val * item.quantity);
                }, 0))}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-16 grid grid-cols-2 gap-12 text-center no-print">
          <div className="border-t border-slate-400 pt-4">
            <p className="font-bold">Responsável pela Pesquisa</p>
            <p className="text-sm text-slate-500">Nome e Assinatura</p>
          </div>
          <div className="border-t border-slate-400 pt-4">
            <p className="font-bold">Autoridade Competente</p>
            <p className="text-sm text-slate-500">Aprovação</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white p-6 z-20 hidden md:block">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="text-white" size={24} />
          </div>
          <h1 className="font-bold text-xl tracking-tight">MapaPro</h1>
        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button 
            onClick={fetchHistory}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'history' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <History size={20} />
            Histórico
          </button>
        </nav>

        <div className="absolute bottom-8 left-6 right-6">
          {/* Version removed as requested */}
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-8">
        <AnimatePresence mode="wait">
          {view === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <header className="flex justify-between items-end mb-12">
                <div>
                  <h2 className="text-4xl font-bold tracking-tight mb-2">Pesquisas de Preço</h2>
                  <p className="text-slate-500">Gerencie seus processos de contratação e cotações.</p>
                </div>
                <Button onClick={() => setShowProcessModal(true)} className="h-12 px-6">
                  <Plus size={20} /> Novo Processo
                </Button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {processes.map((p) => (
                  <Card
                    key={p.id}
                    className="group hover:border-slate-400 transition-all cursor-pointer"
                    onClick={() => fetchProcessDetails(p)}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase tracking-widest">
                          {p.process_number}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteProcess(p.id); }}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">{p.object}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <History size={14} />
                        {formatDate(p.created_at)}
                      </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-500">Clique para gerenciar</span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </Card>
                ))}

                {processes.length === 0 && !loading && (
                  <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-1">Nenhum processo encontrado</h3>
                    <p className="text-slate-500 mb-6">Comece criando sua primeira pesquisa de preços.</p>
                    <Button onClick={() => setShowProcessModal(true)} variant="secondary">
                      Criar agora
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : view === 'history' ? (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <header className="mb-12">
                <h2 className="text-4xl font-bold tracking-tight mb-2">Histórico de Itens</h2>
                <p className="text-slate-500">Todos os itens cadastrados em todos os processos.</p>
              </header>

              <div className="space-y-4">
                {historyItems.map((item) => (
                  <Card key={item.id} className="p-4 hover:border-slate-400 transition-all cursor-pointer" onClick={() => {
                    const proc = processes.find(p => p.id === item.process_id);
                    if (proc) fetchProcessDetails(proc);
                  }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                            {item.process_number}
                          </span>
                          <span className="text-xs text-slate-400">Item {item.item_number}</span>
                        </div>
                        <h3 className="text-lg font-bold">{item.specification}</h3>
                        <p className="text-sm text-slate-500">{item.quantity} {item.unit}</p>
                      </div>
                      <ChevronRight size={20} className="text-slate-300" />
                    </div>
                  </Card>
                ))}
                {historyItems.length === 0 && (
                  <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                    <p className="text-slate-500">Nenhum item no histórico.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="process"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" onClick={() => setView('dashboard')}>
                  <ArrowLeft size={20} /> Voltar
                </Button>
                <div className="h-8 w-px bg-slate-200 mx-2" />
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{selectedProcess?.process_number}</h2>
                  <p className="text-sm text-slate-500 truncate max-w-md">{selectedProcess?.object}</p>
                </div>
                <div className="ml-auto flex gap-3">
                  <Button variant="secondary" onClick={() => setView('export')}>
                    <FileText size={18} /> Ver Mapa Final
                  </Button>
                  <Button onClick={() => setShowItemModal(true)}>
                    <Plus size={18} /> Adicionar Item
                  </Button>
                </div>
              </div>

              <div className="space-y-8">
                {items.map((item) => {
                  const itemQuotes = quotes[item.id] || [];
                  const stats = calculateStats(itemQuotes, item.quantity);
                  const hasHighCV = stats.cv > 25;

                  return (
                    <Card key={item.id} className="border-l-4 border-l-slate-900">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-600">
                              {item.item_number}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold mb-1">{item.specification}</h3>
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><Package size={14} /> {item.quantity} {item.unit}</span>
                                <span className="flex items-center gap-1"><Calculator size={14} /> {itemQuotes.length} cotações</span>
                                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-semibold uppercase">
                                  {item.pricing_strategy === 'sanitized' ? 'Média Saneada' : item.pricing_strategy === 'mean' ? 'Média Comum' : 'Mediana'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => {
                              setEditingItem(item);
                              setNewItem({ 
                                item_number: item.item_number, 
                                specification: item.specification, 
                                unit: item.unit, 
                                quantity: item.quantity,
                                pricing_strategy: item.pricing_strategy
                              });
                              setShowItemModal(true);
                            }}>
                              <Copy size={18} className="text-slate-400" />
                            </Button>
                            <Button variant="ghost" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 size={18} className="text-red-400" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          {/* Quotes List */}
                          <div className="lg:col-span-2 space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cotações Coletadas</h4>
                              <button 
                                onClick={() => {
                                  setEditingQuote(null);
                                  setShowQuoteModal(item.id);
                                }}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                              >
                                <Plus size={14} /> ADICIONAR PREÇO
                              </button>
                            </div>

                            <div className="space-y-2">
                              {itemQuotes.map((q) => {
                                const isOutlier = q.unit_price < stats.lowerLimit || q.unit_price > stats.upperLimit;
                                return (
                                  <div key={q.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                    <div className="flex items-center gap-4">
                                      <div className={`w-2 h-2 rounded-full ${isOutlier ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                      <div className="cursor-pointer" onClick={() => {
                                        setEditingQuote({ quote: q, itemId: item.id });
                                        setNewQuote({
                                          source: q.source,
                                          quote_date: q.quote_date,
                                          unit_price: q.unit_price,
                                          quote_type: q.quote_type
                                        });
                                        setShowQuoteModal(item.id);
                                      }}>
                                        <p className="font-semibold text-sm hover:text-emerald-600 transition-colors">{q.source}</p>
                                        <div className="flex items-center gap-2">
                                          <p className="text-[10px] text-slate-400 uppercase">{formatDate(q.quote_date)}</p>
                                          <span className={`text-[8px] px-1 rounded font-bold uppercase ${q.quote_type === 'public' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
                                            {q.quote_type === 'public' ? 'Pública' : 'Privada'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="text-right">
                                        <p className={`font-mono font-bold ${isOutlier ? 'text-slate-400 line-through' : ''}`}>
                                          {formatCurrency(q.unit_price)}
                                        </p>
                                        {isOutlier && <p className="text-[10px] text-red-500 font-bold uppercase">Outlier</p>}
                                      </div>
                                      <button 
                                        onClick={() => handleDeleteQuote(q.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              {itemQuotes.length === 0 && (
                                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                  <p className="text-sm text-slate-400">Nenhuma cotação inserida.</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stats Panel */}
                          <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between">
                            <div>
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Análise Estatística</h4>
                              
                              <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                  <span className="text-xs text-slate-400">Média Saneada</span>
                                  <span className="font-mono font-bold">{formatCurrency(stats.sanitizedMean)}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                  <span className="text-xs text-slate-400">Coef. Variação</span>
                                  <span className={`font-mono font-bold ${hasHighCV ? 'text-orange-400' : 'text-emerald-400'}`}>
                                    {stats.cv.toFixed(2)}%
                                  </span>
                                </div>
                                <div className="flex justify-between items-end">
                                  <span className="text-xs text-slate-400">Amostras Válidas</span>
                                  <span className="font-mono font-bold">{stats.validQuotes} / {itemQuotes.length}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/10">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Estimado</p>
                              <p className="text-3xl font-bold font-mono tracking-tighter">{formatCurrency(stats.totalEstimated)}</p>
                              
                              {hasHighCV && (
                                <div className="mt-4 flex items-center gap-2 text-orange-400 bg-orange-400/10 p-2 rounded-lg text-[10px] font-bold uppercase">
                                  <AlertTriangle size={14} /> CV Alto: Requer mais cotações
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {items.length === 0 && (
                  <div className="py-24 text-center bg-white rounded-3xl border border-slate-200">
                    <Package className="mx-auto text-slate-200 mb-4" size={48} />
                    <h3 className="text-xl font-bold mb-1">Nenhum item cadastrado</h3>
                    <p className="text-slate-500 mb-6">Adicione os itens que compõem este processo.</p>
                    <Button onClick={() => setShowItemModal(true)} variant="secondary">
                      Adicionar Item
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showProcessModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">Novo Processo</h3>
              <form onSubmit={handleCreateProcess} className="space-y-6">
                <Input 
                  label="Número do Processo / UASG" 
                  placeholder="Ex: 001/2024" 
                  required
                  value={newProcess.process_number}
                  onChange={e => setNewProcess({...newProcess, process_number: e.target.value})}
                />
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Objeto da Contratação</label>
                  <textarea 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all min-h-[100px]"
                    placeholder="Descreva o que está sendo contratado..."
                    required
                    value={newProcess.object}
                    onChange={e => setNewProcess({...newProcess, object: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowProcessModal(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1">Criar Processo</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showItemModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">{editingItem ? 'Editar Item' : 'Adicionar Item'}</h3>
              <form onSubmit={handleCreateItem} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Item nº" 
                    type="number"
                    required
                    value={newItem.item_number}
                    onChange={e => setNewItem({...newItem, item_number: parseInt(e.target.value)})}
                  />
                  <Input 
                    label="Unidade" 
                    placeholder="Ex: UN, M², Serv" 
                    required
                    value={newItem.unit}
                    onChange={e => setNewItem({...newItem, unit: e.target.value})}
                  />
                </div>
                <Input 
                  label="Especificação Sucinta" 
                  placeholder="Ex: Cadeira de escritório ergonômica" 
                  required
                  value={newItem.specification}
                  onChange={e => setNewItem({...newItem, specification: e.target.value})}
                />
                <Input 
                  label="Quantidade Estimada" 
                  type="number"
                  step="0.01"
                  required
                  value={newItem.quantity}
                  onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}
                />
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estratégia de Preço</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                    value={newItem.pricing_strategy}
                    onChange={e => setNewItem({...newItem, pricing_strategy: e.target.value as any})}
                  >
                    <option value="sanitized">Média Saneada</option>
                    <option value="mean">Média Comum</option>
                    <option value="median">Mediana</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="secondary" className="flex-1" onClick={() => { setShowItemModal(false); setEditingItem(null); }}>Cancelar</Button>
                  <Button type="submit" className="flex-1">Salvar Item</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {(showQuoteModal !== null || editingQuote !== null) && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">{editingQuote ? 'Editar Cotação' : 'Nova Cotação'}</h3>
              <form onSubmit={handleCreateQuote} className="space-y-6">
                <Input 
                  label="Fonte / Fornecedor (CNPJ/Nome)" 
                  placeholder="Ex: Empresa de Móveis Ltda" 
                  required
                  value={newQuote.source}
                  onChange={e => setNewQuote({...newQuote, source: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Data da Cotação" 
                    type="date"
                    required
                    value={newQuote.quote_date}
                    onChange={e => setNewQuote({...newQuote, quote_date: e.target.value})}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Fonte</label>
                    <select 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                      value={newQuote.quote_type}
                      onChange={e => setNewQuote({...newQuote, quote_type: e.target.value as any})}
                    >
                      <option value="private">Privada (180 dias)</option>
                      <option value="public">Pública (360 dias)</option>
                    </select>
                  </div>
                </div>
                <Input 
                  label="Valor Unitário (R$)" 
                  type="number"
                  step="0.01"
                  required
                  value={newQuote.unit_price}
                  onChange={e => setNewQuote({...newQuote, unit_price: parseFloat(e.target.value)})}
                />
                <div className="flex gap-3 pt-4">
                  <Button variant="secondary" className="flex-1" onClick={() => { setShowQuoteModal(null); setEditingQuote(null); }}>Cancelar</Button>
                  <Button type="submit" className="flex-1">Salvar Cotação</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          main { margin: 0 !important; padding: 0 !important; }
          aside { display: none !important; }
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      `}</style>
    </div>
  );
}
