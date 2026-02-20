import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "db.json");

// Types for our JSON database
interface Process {
  id: number;
  process_number: string;
  object: string;
  created_at: string;
}

interface Item {
  id: number;
  process_id: number;
  item_number: number;
  specification: string;
  unit: string;
  quantity: number;
  pricing_strategy: string;
}

interface Quote {
  id: number;
  item_id: number;
  source: string;
  quote_date: string;
  unit_price: number;
  quote_type: string;
  is_outlier: number;
}

interface DBData {
  processes: Process[];
  items: Item[];
  quotes: Quote[];
}

// Initial data if file doesn't exist
const initialData: DBData = {
  processes: [],
  items: [],
  quotes: []
};

// Database helper functions
function readDB(): DBData {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  const content = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(content);
}

function writeDB(data: DBData) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getNextId(collection: { id: number }[]): number {
  return collection.length > 0 ? Math.max(...collection.map(i => i.id)) + 1 : 1;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // API Routes
  
  // Processes
  app.get("/api/processes", (req, res) => {
    try {
      const data = readDB();
      const rows = [...data.processes].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      res.json(rows);
    } catch (error) {
      console.error("Error fetching processes:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/processes", (req, res) => {
    try {
      const { process_number, object } = req.body;
      const data = readDB();
      const newProcess: Process = {
        id: getNextId(data.processes),
        process_number,
        object,
        created_at: new Date().toISOString()
      };
      data.processes.push(newProcess);
      writeDB(data);
      res.json({ id: newProcess.id });
    } catch (error) {
      console.error("Error creating process:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/processes/:id", (req, res) => {
    try {
      const data = readDB();
      const process = data.processes.find(p => p.id === parseInt(req.params.id));
      if (!process) return res.status(404).json({ error: "Process not found" });
      res.json(process);
    } catch (error) {
      console.error("Error fetching process:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/processes/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { process_number, object } = req.body;
      const data = readDB();
      const processIndex = data.processes.findIndex(p => p.id === id);
      
      if (processIndex !== -1) {
        data.processes[processIndex] = {
          ...data.processes[processIndex],
          process_number,
          object
        };
        writeDB(data);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Process not found" });
      }
    } catch (error) {
      console.error("Error updating process:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/processes/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = readDB();
      
      // Cascading delete
      data.processes = data.processes.filter(p => p.id !== id);
      const itemsToDelete = data.items.filter(i => i.process_id === id).map(i => i.id);
      data.items = data.items.filter(i => i.process_id !== id);
      data.quotes = data.quotes.filter(q => !itemsToDelete.includes(q.item_id));
      
      writeDB(data);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting process:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Items
  app.get("/api/processes/:id/items", (req, res) => {
    try {
      const processId = parseInt(req.params.id);
      const data = readDB();
      const rows = data.items
        .filter(i => i.process_id === processId)
        .sort((a, b) => a.item_number - b.item_number);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/processes/:id/items", (req, res) => {
    try {
      const processId = parseInt(req.params.id);
      const { item_number, specification, unit, quantity, pricing_strategy } = req.body;
      const data = readDB();
      const newItem: Item = {
        id: getNextId(data.items),
        process_id: processId,
        item_number,
        specification,
        unit,
        quantity,
        pricing_strategy: pricing_strategy || 'sanitized'
      };
      data.items.push(newItem);
      writeDB(data);
      res.json({ id: newItem.id });
    } catch (error) {
      console.error("Error creating item:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/processes/:id/items/batch", (req, res) => {
    try {
      const processId = parseInt(req.params.id);
      const data = readDB();
      let nextId = getNextId(data.items);
      
      const newItems = req.body.items.map((item: any) => ({
        id: nextId++,
        process_id: processId,
        item_number: item.item_number,
        specification: item.specification,
        unit: item.unit,
        quantity: item.quantity,
        pricing_strategy: item.pricing_strategy || 'sanitized'
      }));
      
      data.items.push(...newItems);
      writeDB(data);
      res.json({ success: true });
    } catch (error) {
      console.error("Error batch creating items:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/items/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { specification, unit, quantity, pricing_strategy, item_number } = req.body;
      const data = readDB();
      const itemIndex = data.items.findIndex(i => i.id === id);
      
      if (itemIndex !== -1) {
        data.items[itemIndex] = {
          ...data.items[itemIndex],
          specification,
          unit,
          quantity,
          pricing_strategy,
          item_number
        };
        writeDB(data);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/items/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = readDB();
      
      const originalCount = data.items.length;
      data.items = data.items.filter(i => i.id !== id);
      
      if (data.items.length === originalCount) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Cascading delete for quotes
      data.quotes = data.quotes.filter(q => q.item_id !== id);
      
      writeDB(data);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Quotes
  app.get("/api/items/:id/quotes", (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const data = readDB();
      const rows = data.quotes
        .filter(q => q.item_id === itemId)
        .sort((a, b) => new Date(b.quote_date).getTime() - new Date(a.quote_date).getTime());
      res.json(rows);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/items/:id/quotes", (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const { source, quote_date, unit_price, quote_type } = req.body;
      const data = readDB();
      const newQuote: Quote = {
        id: getNextId(data.quotes),
        item_id: itemId,
        source,
        quote_date,
        unit_price,
        quote_type: quote_type || 'private',
        is_outlier: 0
      };
      data.quotes.push(newQuote);
      writeDB(data);
      res.json({ id: newQuote.id });
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/items/:id/quotes/batch", (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const data = readDB();
      let nextId = getNextId(data.quotes);
      
      const newQuotes = req.body.quotes.map((quote: any) => ({
        id: nextId++,
        item_id: itemId,
        source: quote.source,
        quote_date: quote.quote_date,
        unit_price: quote.unit_price,
        quote_type: quote.quote_type || 'private',
        is_outlier: 0
      }));
      
      data.quotes.push(...newQuotes);
      writeDB(data);
      res.json({ success: true });
    } catch (error) {
      console.error("Error batch creating quotes:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/quotes/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { source, quote_date, unit_price, quote_type } = req.body;
      const data = readDB();
      const quoteIndex = data.quotes.findIndex(q => q.id === id);
      
      if (quoteIndex !== -1) {
        data.quotes[quoteIndex] = {
          ...data.quotes[quoteIndex],
          source,
          quote_date,
          unit_price,
          quote_type
        };
        writeDB(data);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Quote not found" });
      }
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/quotes/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = readDB();
      const originalCount = data.quotes.length;
      data.quotes = data.quotes.filter(q => q.id !== id);
      
      if (data.quotes.length === originalCount) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      writeDB(data);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // History / Global Search
  app.get("/api/history", (req, res) => {
    try {
      const data = readDB();
      const rows = data.items.map(item => {
        const process = data.processes.find(p => p.id === item.process_id);
        return {
          ...item,
          process_number: process?.process_number,
          object: process?.object,
          created_at: process?.created_at
        };
      }).sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      res.json(rows);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Global error handler for API routes
  app.use("/api", (err: any, req: any, res: any, next: any) => {
    console.error("API Error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database: ${DB_PATH}`);
  });
}

startServer();
