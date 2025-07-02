const express = require('express');
const app = express();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { analyze } = require('./gemini');

// configure disk storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + file.originalname;
    cb(null, unique);
  }
});

const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const DB_FILE = path.join(__dirname, 'db.json');

function loadDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { pages: [], sessions: [] };
  }
}

let db = loadDB();

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const PORT = process.env.PORT || 3000;

// Pages are stored in the local JSON database
const pages = db.pages;

// return list of pages or single page by id
app.get('/api/pages', (req, res) => {
  const { id } = req.query;
  if (id) {
    const page = pages.find(p => p.id === id);
    if (!page) return res.status(404).json({ error: 'Not found' });
    return res.json({ page });
  }
  const list = pages.map(p => ({ id: p.id, title: p.title }));
  res.json({ pages: list });
});

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  const { text, type } = req.body;
  const filePath = req.file ? req.file.path : null;
  const { tags, aiResponse, extracted } = await analyze({ text: text || '', filePath });

  // search pages by tags and type
  const found = pages.filter(p => p.id.startsWith(type) && p.tags.some(t => tags.includes(t)));
  let fileInfo = null;
  if (req.file) {
    fileInfo = { filename: req.file.filename, originalname: req.file.originalname };
  }

  const session = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    text: text || '',
    type,
    tags,
    aiResponse,
    pages: found.map(p => p.id),
    file: fileInfo,
    extracted,
  };
  db.sessions.push(session);
  saveDB();

  res.json({ tags, aiResponse, pages: found, file: fileInfo, extracted });
});

// list uploaded files
app.get('/api/files', (req, res) => {
  fs.readdir(path.join(__dirname, 'uploads'), (err, files) => {
    if (err) return res.status(500).json({ error: 'Cannot read uploads' });
    res.json({ files });
  });
});

// return stored sessions
app.get('/api/sessions', (req, res) => {
  res.json({ sessions: db.sessions });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
