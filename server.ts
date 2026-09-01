import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { createServer as createViteServer } from 'vite';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Setup upload directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Setup data file
const DATA_FILE = path.join(process.cwd(), 'attendance.json');
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage: storage });

// API Routes
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/attendance', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/attendance', upload.single('document'), (req, res) => {
  try {
    const { name, status, date, department } = req.body;
    const documentUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    
    const newRecord = {
      id: uuidv4(),
      name,
      department: department || 'Umum',
      status,
      date,
      time: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      documentUrl,
      timestamp: new Date().toISOString()
    };

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    data.push(newRecord);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    // Emit to all connected clients for real-time updates
    io.emit('attendance-update', newRecord);

    res.status(201).json(newRecord);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.put('/api/attendance/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, status, date } = req.body;
    
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const index = data.findIndex((r: any) => r.id === id);
    
    if (index !== -1) {
      data[index] = { ...data[index], name, department, status, date };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      
      io.emit('attendance-updated', data[index]);
      res.json(data[index]);
    } else {
      res.status(404).json({ error: 'Record not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update data' });
  }
});

app.delete('/api/attendance/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const newData = data.filter((r: any) => r.id !== id);
    
    if (data.length !== newData.length) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2));
      io.emit('attendance-deleted', id);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Record not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

app.delete('/api/attendance/month/:yearMonth', (req, res) => {
  try {
    const { yearMonth } = req.params;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const newData = data.filter((r: any) => !r.date.startsWith(yearMonth));
    
    if (data.length !== newData.length) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2));
      io.emit('attendance-month-deleted', yearMonth);
      res.json({ success: true, deletedCount: data.length - newData.length });
    } else {
      res.status(404).json({ error: 'Record not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete month data' });
  }
});

// Admin Authentication
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (pin === 'IcakuMoetMoet88') {
    res.json({ success: true, token: 'admin-token-123' });
  } else {
    res.status(401).json({ success: false, error: 'PIN Salah' });
  }
});

// Start Server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
