const express = require('express');
const app = express();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

const PORT = process.env.PORT || 3000;

// Example pages with tags and content
const pages = [
  {
    id: 'civil-1',
    tags: ['иск', 'договор', 'гражданский'],
    title: 'Образец гражданского иска',
    content: '<h3>Образец гражданского иска</h3><p>Здесь находится шаблон гражданского иска...</p>'
  },
  {
    id: 'criminal-1',
    tags: ['уголовный', 'преступление'],
    title: 'Памятка по уголовному процессу',
    content: '<h3>Памятка по уголовному процессу</h3><p>Советы и примеры оформления заявлений...</p>'
  },
  {
    id: 'admin-1',
    tags: ['административный', 'жалоба'],
    title: 'Пример административной жалобы',
    content: '<h3>Пример административной жалобы</h3><p>Шаблон для составления жалобы...</p>'
  }
];

function fakeGeminiResponse(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const tags = words.slice(0, 3); // simplistic tag generation
  const aiResponse = `AI ответ на запрос: ${text}`;
  return { tags, aiResponse };
}

function fakeExtractData(content) {
  const nameMatch = content.match(/ФИО[:\s]+([\w\s]+)/i);
  const dateMatch = content.match(/(\d{2}\.\d{2}\.\d{4})/);
  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    date: dateMatch ? dateMatch[1] : null,
  };
}

app.post('/api/analyze', upload.single('file'), (req, res) => {
  const { text, type } = req.body;
  const { tags, aiResponse } = fakeGeminiResponse(text || '');
  // search pages by tags and type
  const found = pages.filter(p => p.id.startsWith(type) && p.tags.some(t => tags.includes(t)));
  let fileInfo = null;
  let extracted = null;
  if (req.file) {
    fileInfo = { filename: req.file.filename, originalname: req.file.originalname };
    if (req.file.mimetype === 'text/plain') {
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      extracted = fakeExtractData(fileContent);
    }
  }
  res.json({ tags, aiResponse, pages: found, file: fileInfo, extracted });
});

// list uploaded files
app.get('/api/files', (req, res) => {
  fs.readdir(path.join(__dirname, 'uploads'), (err, files) => {
    if (err) return res.status(500).json({ error: 'Cannot read uploads' });
    res.json({ files });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
