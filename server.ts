import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = 3000;

// Setup SQLite
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}
const db = new Database(path.join(dbDir, 'app.db'));

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS instructions (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL,
    name TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    bg_color TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    instruction_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default data if empty
const count = db.prepare('SELECT COUNT(*) as count FROM scenarios').get() as { count: number };
if (count.count === 0) {
  const scenarioId = uuidv4();
  db.prepare('INSERT INTO scenarios (id, name, sort_order) VALUES (?, ?, ?)').run(scenarioId, 'Thorax de face debout', 1);
  
  const insert = db.prepare('INSERT INTO instructions (id, scenario_id, name, bg_color, sort_order) VALUES (?, ?, ?, ?, ?)');
  for (let i = 1; i <= 8; i++) {
    insert.run(uuidv4(), scenarioId, `${i}`, 'bg-blue-500', i);
  }
}

// Setup Multer for uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage });

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.get('/api/scenarios', (req, res) => {
  const scenarios = db.prepare('SELECT * FROM scenarios ORDER BY sort_order ASC').all();
  res.json(scenarios);
});

app.post('/api/scenarios', (req, res) => {
  const { name, stepsCount } = req.body;
  const id = uuidv4();
  const sort_order = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM scenarios').get() as { next: number };
  
  const insertScenario = db.prepare('INSERT INTO scenarios (id, name, sort_order) VALUES (?, ?, ?)');
  const insertInstruction = db.prepare('INSERT INTO instructions (id, scenario_id, name, bg_color, sort_order) VALUES (?, ?, ?, ?, ?)');
  
  const transaction = db.transaction(() => {
    insertScenario.run(id, name, sort_order.next);
    const count = parseInt(stepsCount) || 1;
    for (let i = 1; i <= count; i++) {
      insertInstruction.run(uuidv4(), id, `${i}`, 'bg-blue-500', i);
    }
  });
  transaction();
  
  io.emit('scenarios_updated');
  res.json({ id, name, sort_order: sort_order.next });
});

app.delete('/api/scenarios/:id', (req, res) => {
  const { id } = req.params;
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM instructions WHERE scenario_id = ?').run(id);
    db.prepare('DELETE FROM scenarios WHERE id = ?').run(id);
  });
  transaction();
  io.emit('scenarios_updated');
  res.json({ success: true });
});

app.get('/api/scenarios/:scenarioId/instructions', (req, res) => {
  const { scenarioId } = req.params;
  const instructions = db.prepare('SELECT * FROM instructions WHERE scenario_id = ? ORDER BY sort_order ASC').all(scenarioId);
  res.json(instructions);
});

app.post('/api/scenarios/:scenarioId/instructions', (req, res) => {
  const { scenarioId } = req.params;
  const { name, bg_color } = req.body;
  const id = uuidv4();
  const sort_order = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM instructions WHERE scenario_id = ?').get(scenarioId) as { next: number };
  db.prepare('INSERT INTO instructions (id, scenario_id, name, bg_color, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(id, scenarioId, name, bg_color || 'bg-blue-500', sort_order.next);
  io.emit('instructions_updated');
  res.json({ id, scenario_id: scenarioId, name, bg_color, sort_order: sort_order.next });
});

app.put('/api/instructions/:id', upload.single('media'), (req, res) => {
  const { id } = req.params;
  const { name, bg_color } = req.body;
  const file = req.file;
  
  let updateQuery = 'UPDATE instructions SET name = ?, bg_color = ?';
  const params: any[] = [name, bg_color];
  
  if (file) {
    const media_url = `/uploads/${file.filename}`;
    const media_type = file.mimetype.startsWith('video/') ? 'video' : 'image';
    updateQuery += ', media_url = ?, media_type = ?';
    params.push(media_url, media_type);
  } else if (req.body.remove_media === 'true') {
    updateQuery += ', media_url = NULL, media_type = NULL';
  }
  
  updateQuery += ' WHERE id = ?';
  params.push(id);
  
  db.prepare(updateQuery).run(...params);
  
  const updated = db.prepare('SELECT * FROM instructions WHERE id = ?').get(id);
  
  // Broadcast update to staff clients
  io.emit('instructions_updated');
  
  res.json(updated);
});

app.delete('/api/instructions/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM instructions WHERE id = ?').run(id);
  io.emit('instructions_updated');
  res.json({ success: true });
});

app.get('/api/history', (req, res) => {
  const history = db.prepare(`
    SELECT h.id, h.timestamp, i.name, i.bg_color 
    FROM history h 
    JOIN instructions i ON h.instruction_id = i.id 
    ORDER BY h.timestamp DESC 
    LIMIT 50
  `).all();
  res.json(history);
});

// WebSocket logic
let patientConnected = false;
let currentInstruction: any = null;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('register_role', (role) => {
    if (role === 'patient') {
      patientConnected = true;
      socket.join('patient_room');
      io.emit('patient_status', { connected: true });
      if (currentInstruction) {
        socket.emit('play_instruction', currentInstruction);
      }
    } else if (role === 'staff') {
      socket.join('staff_room');
      socket.emit('patient_status', { connected: patientConnected });
    }
  });

  socket.on('send_instruction', (instruction) => {
    currentInstruction = instruction;
    
    // Log to history
    if (instruction && instruction.id) {
      db.prepare('INSERT INTO history (id, instruction_id) VALUES (?, ?)')
        .run(uuidv4(), instruction.id);
    }
    
    io.to('patient_room').emit('play_instruction', instruction);
    io.to('staff_room').emit('history_updated');
  });
  
  socket.on('clear_instruction', () => {
    currentInstruction = null;
    io.to('patient_room').emit('clear_instruction');
  });

  socket.on('disconnect', () => {
    setTimeout(() => {
      const patientRoom = io.sockets.adapter.rooms.get('patient_room');
      const isPatientConnected = patientRoom ? patientRoom.size > 0 : false;
      if (patientConnected !== isPatientConnected) {
        patientConnected = isPatientConnected;
        io.emit('patient_status', { connected: patientConnected });
      }
    }, 1000);
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
