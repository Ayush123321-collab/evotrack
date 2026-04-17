// server.js - Express REST API
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ WASTE LOGS ============
app.get('/api/waste', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM waste_logs ORDER BY date DESC, id DESC').all();
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/waste', (req, res) => {
  const { item, category, weight, cost, reason, date, notes } = req.body;
  if (!item || !category || !weight || !reason || !date)
    return res.status(400).json({ error: 'Missing required fields' });
  try {
    const stmt = db.prepare(`INSERT INTO waste_logs (item, category, weight, cost, reason, date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const result = stmt.run(item, category, weight, cost || 0, reason, date, notes || '');
    res.status(201).json(db.prepare('SELECT * FROM waste_logs WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/waste/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM waste_logs WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/waste', (req, res) => {
  try { db.prepare('DELETE FROM waste_logs').run(); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ INVENTORY ============
app.get('/api/inventory', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM inventory ORDER BY expiry ASC').all();
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory', (req, res) => {
  const { name, category, quantity, expiry } = req.body;
  if (!name || !category || !quantity || !expiry)
    return res.status(400).json({ error: 'Missing required fields' });
  try {
    const stmt = db.prepare(`INSERT INTO inventory (name, category, quantity, expiry) VALUES (?, ?, ?, ?)`);
    const result = stmt.run(name, category, quantity, expiry);
    res.status(201).json(db.prepare('SELECT * FROM inventory WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/inventory/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ STATS & ANALYTICS ============
app.get('/api/stats', (req, res) => {
  try {
    const totals = db.prepare(`SELECT COUNT(*) as entries, COALESCE(SUM(weight),0) as totalWeight,
      COALESCE(SUM(cost),0) as totalCost FROM waste_logs`).get();
    const thisWeek = db.prepare(`SELECT COALESCE(SUM(weight),0) as total FROM waste_logs
      WHERE date >= date('now','-7 days')`).get();
    const lastWeek = db.prepare(`SELECT COALESCE(SUM(weight),0) as total FROM waste_logs
      WHERE date >= date('now','-14 days') AND date < date('now','-7 days')`).get();
    const invCount = db.prepare('SELECT COUNT(*) as count FROM inventory').get();
    res.json({
      totalEntries: totals.entries,
      totalWeight: totals.totalWeight,
      totalCost: totals.totalCost,
      thisWeek: thisWeek.total,
      lastWeek: lastWeek.total,
      inventoryCount: invCount.count,
      co2Impact: totals.totalWeight * 2.5
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats/daily/:days', (req, res) => {
  try {
    const days = parseInt(req.params.days) || 30;
    const rows = db.prepare(`SELECT date, COALESCE(SUM(weight),0) as total FROM waste_logs
      WHERE date >= date('now','-' || ? || ' days') GROUP BY date ORDER BY date ASC`).all(days);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats/categories', (req, res) => {
  try {
    const rows = db.prepare(`SELECT category, SUM(weight) as total, COUNT(*) as count
      FROM waste_logs GROUP BY category ORDER BY total DESC`).all();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats/reasons', (req, res) => {
  try {
    const rows = db.prepare(`SELECT reason, SUM(weight) as total, COUNT(*) as count
      FROM waste_logs GROUP BY reason ORDER BY total DESC`).all();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats/top-items', (req, res) => {
  try {
    const rows = db.prepare(`SELECT item, SUM(weight) as total FROM waste_logs
      GROUP BY item ORDER BY total DESC LIMIT 5`).all();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ AI PREDICTIONS ============
app.get('/api/predictions', (req, res) => {
  try {
    // Fetch last 30 days
    const history = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const row = db.prepare(`SELECT COALESCE(SUM(weight),0) as total FROM waste_logs WHERE date = ?`).get(key);
      history.push({ date: key, total: row.total });
    }

    // Linear regression
    const y = history.map(h => h.total);
    const n = y.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
    const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
    const intercept = (sumY - slope * sumX) / n || 0;

    const forecast = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      forecast.push({
        date: d.toISOString().split('T')[0],
        predicted: Math.max(0, slope * (29 + i) + intercept)
      });
    }

    res.json({
      history,
      forecast,
      slope,
      totalForecast: forecast.reduce((s, f) => s + f.predicted, 0),
      avgDaily: sumY / n
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ SAMPLE DATA ============
app.post('/api/sample-data', (req, res) => {
  try {
    const items = [
      ['Tomatoes','Vegetables','Spoiled'],['Lettuce','Vegetables','Expired'],
      ['Bananas','Fruits','Spoiled'],['Bread','Bakery','Expired'],
      ['Milk','Dairy','Expired'],['Chicken','Meat','Spoiled'],
      ['Rice','Grains','Over-prepared'],['Apples','Fruits','Spoiled'],
      ['Cheese','Dairy','Expired'],['Pasta','Grains','Over-prepared']
    ];
    const insertWaste = db.prepare(`INSERT INTO waste_logs (item, category, weight, cost, reason, date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const insertInv = db.prepare(`INSERT INTO inventory (name, category, quantity, expiry) VALUES (?, ?, ?, ?)`);

    const tx = db.transaction(() => {
      for (let i = 29; i >= 0; i--) {
        const count = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < count; j++) {
          const [item, cat, reason] = items[Math.floor(Math.random() * items.length)];
          const d = new Date(); d.setDate(d.getDate() - i);
          insertWaste.run(item, cat, +(Math.random()*2+0.2).toFixed(2),
            +(Math.random()*15+2).toFixed(2), reason, d.toISOString().split('T')[0], '');
        }
      }
      const invItems = [['Tomatoes','Vegetables',5],['Milk','Dairy',2],
        ['Bread','Bakery',1],['Apples','Fruits',7],['Chicken','Meat',3]];
      invItems.forEach(([name, cat, days]) => {
        const exp = new Date(); exp.setDate(exp.getDate() + days);
        insertInv.run(name, cat, +(Math.random()*3+0.5).toFixed(2), exp.toISOString().split('T')[0]);
      });
    });
    tx();
    res.json({ success: true, message: 'Sample data loaded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
  console.log(`🚀 EcoTrack server running on http://localhost:${PORT}`);
});
