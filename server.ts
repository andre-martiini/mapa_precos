import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("prices.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS processes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    process_number TEXT NOT NULL,
    object TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    process_id INTEGER NOT NULL,
    item_number INTEGER NOT NULL,
    specification TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity REAL NOT NULL,
    pricing_strategy TEXT DEFAULT 'sanitized',
    FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    quote_date DATE NOT NULL,
    unit_price REAL NOT NULL,
    quote_type TEXT DEFAULT 'private',
    is_outlier INTEGER DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  );
`);

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
      const rows = db.prepare("SELECT * FROM processes ORDER BY created_at DESC").all();
      res.json(rows);
    } catch (error) {
      console.error("Error fetching processes:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/items/reorder", (req, res) => {
    try {
      const { items } = req.body; // Array of { id, item_number }
      const updateStmt = db.prepare("UPDATE items SET item_number = ? WHERE id = ?");
      const transaction = db.transaction((items) => {
        for (const item of items) {
          updateStmt.run(item.item_number, item.id);
        }
      });
      transaction(items);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering items:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/processes", (req, res) => {
    try {
      const { process_number, object } = req.body;
      const result = db.prepare("INSERT INTO processes (process_number, object) VALUES (?, ?)").run(process_number, object);
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      console.error("Error creating process:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/processes/:id", (req, res) => {
    try {
      const process = db.prepare("SELECT * FROM processes WHERE id = ?").get(req.params.id);
      if (!process) return res.status(404).json({ error: "Process not found" });
      res.json(process);
    } catch (error) {
      console.error("Error fetching process:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/processes/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM processes WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting process:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Items
  app.get("/api/processes/:id/items", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM items WHERE process_id = ? ORDER BY item_number ASC").all(req.params.id);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/processes/:id/items", (req, res) => {
    try {
      const { item_number, specification, unit, quantity, pricing_strategy } = req.body;
      const result = db.prepare("INSERT INTO items (process_id, item_number, specification, unit, quantity, pricing_strategy) VALUES (?, ?, ?, ?, ?, ?)")
        .run(req.params.id, item_number, specification, unit, quantity, pricing_strategy || 'sanitized');
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      console.error("Error creating item:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/items/:id", (req, res) => {
    try {
      const { specification, unit, quantity, pricing_strategy, item_number } = req.body;
      db.prepare("UPDATE items SET specification = ?, unit = ?, quantity = ?, pricing_strategy = ?, item_number = ? WHERE id = ?")
        .run(specification, unit, quantity, pricing_strategy, item_number, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/items/:id", (req, res) => {
    try {
      const result = db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);
      if (result.changes === 0) return res.status(404).json({ error: "Item not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Quotes
  app.get("/api/items/:id/quotes", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM quotes WHERE item_id = ? ORDER BY quote_date DESC").all(req.params.id);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/items/:id/quotes", (req, res) => {
    try {
      const { source, quote_date, unit_price, quote_type } = req.body;
      const result = db.prepare("INSERT INTO quotes (item_id, source, quote_date, unit_price, quote_type) VALUES (?, ?, ?, ?, ?)")
        .run(req.params.id, source, quote_date, unit_price, quote_type || 'private');
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/quotes/:id", (req, res) => {
    try {
      const { source, quote_date, unit_price, quote_type } = req.body;
      db.prepare("UPDATE quotes SET source = ?, quote_date = ?, unit_price = ?, quote_type = ? WHERE id = ?")
        .run(source, quote_date, unit_price, quote_type, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/quotes/:id", (req, res) => {
    try {
      const result = db.prepare("DELETE FROM quotes WHERE id = ?").run(req.params.id);
      if (result.changes === 0) return res.status(404).json({ error: "Quote not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // History / Global Search
  app.get("/api/history", (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT items.*, processes.process_number, processes.object 
        FROM items 
        JOIN processes ON items.process_id = processes.id 
        ORDER BY processes.created_at DESC
      `).all();
      res.json(rows);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Global error handler for API routes
  app.use("/api", (err, req, res, next) => {
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
  });
}

startServer();
