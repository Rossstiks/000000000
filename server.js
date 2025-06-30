const express = require('express');
const app = express();
const multer = require('multer');
const upload = multer();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

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

app.post('/api/analyze', upload.single('file'), (req, res) => {
  const { text, type } = req.body;
  const { tags, aiResponse } = fakeGeminiResponse(text || '');
  // search pages by tags and type
  const found = pages.filter(p => p.id.startsWith(type) && p.tags.some(t => tags.includes(t)));
  res.json({ tags, aiResponse, pages: found });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
