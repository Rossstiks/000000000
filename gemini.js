const fs = require('fs');

function fakeGeminiResponse(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const tags = words.slice(0, 3);
  const aiResponse = `Gemini AI ответ на запрос: ${text}`;
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

async function analyze({ text = '', filePath = null }) {
  // Here could be a real API call to Gemini AI. In this offline prototype
  // we return a fake response.
  const { tags, aiResponse } = fakeGeminiResponse(text);
  let extracted = null;
  if (filePath && fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    extracted = fakeExtractData(content);
  }
  return { tags, aiResponse, extracted };
}

module.exports = { analyze };
