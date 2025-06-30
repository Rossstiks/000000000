const { useState } = React;

function Section({ type, label }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('text', text);
    formData.append('type', type);
    if (file) formData.append('file', file);
    const res = await fetch('/api/analyze', { method: 'POST', body: formData });
    const data = await res.json();
    setResult(data);
  };

  return (
    <div className="mb-8 border p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">{label}</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea className="w-full border rounded p-2" rows="3" placeholder="Введите задание" value={text} onChange={e => setText(e.target.value)}></textarea>
        <input type="file" onChange={e => setFile(e.target.files[0])} className="block" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Отправить</button>
      </form>
      {result && (
        <div className="mt-4">
          <h3 className="font-bold">Тэги: {result.tags.join(', ')}</h3>
          <p className="mt-2 italic">{result.aiResponse}</p>
          {result.file && (
            <p className="text-sm mt-1">Файл сохранён как: <a className="text-blue-600 underline" href={`/uploads/${result.file.filename}`} target="_blank" rel="noopener noreferrer">{result.file.originalname}</a></p>
          )}
          {result.pages && result.pages.map(p => (
            <div key={p.id} className="mt-4 p-2 border rounded" dangerouslySetInnerHTML={{ __html: p.content }} />
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <div>
      <Section type="civil" label="Гражданское судопроизводство" />
      <Section type="criminal" label="Уголовное судопроизводство" />
      <Section type="admin" label="Административное судопроизводство" />
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('app'));
