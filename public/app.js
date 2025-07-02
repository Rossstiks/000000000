const { useState, useEffect } = React;
const { BrowserRouter, Routes, Route, Link, useParams } = ReactRouterDOM;

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
    <div className="border p-4 bg-white rounded shadow">
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
          {result.extracted && (
            <div className="mt-2 text-sm">
              <h4 className="font-semibold">Извлечённые данные</h4>
              <ul className="list-disc pl-5">
                {result.extracted.name && <li>ФИО: {result.extracted.name}</li>}
                {result.extracted.date && <li>Дата: {result.extracted.date}</li>}
              </ul>
            </div>
          )}
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

function FilesList() {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => setFiles(data.files || []));
  }, []);

  return (
    <div className="mt-8 border p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Загруженные документы</h2>
      {files.length === 0 ? (
        <p className="text-gray-500">Нет загруженных документов</p>
      ) : (
        <ul className="list-disc pl-5 space-y-1">
          {files.map(f => (
            <li key={f}>
              <a className="text-blue-600 underline" href={`/uploads/${f}`} target="_blank" rel="noopener noreferrer">{f}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadPage() {
  return <Section type="general" label="Загрузка документа" />;
}

function PagesList() {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    fetch('/api/pages')
      .then(res => res.json())
      .then(data => setPages(data.pages || []));
  }, []);

  return (
    <div className="border p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Шаблоны</h2>
      <ul className="list-disc pl-5 space-y-1">
        {pages.map(p => (
          <li key={p.id}>
            <Link className="text-blue-600 underline" to={`/pages/${p.id}`}>{p.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageView() {
  const { id } = useParams();
  const [page, setPage] = useState(null);

  useEffect(() => {
    fetch(`/api/pages?id=${id}`)
      .then(res => res.json())
      .then(data => setPage(data.page || null));
  }, [id]);

  if (!page) return <p className="p-4">Загрузка...</p>;
  return (
    <div className="border p-4 bg-white rounded shadow" dangerouslySetInnerHTML={{ __html: page.content }} />
  );
}

function DocumentForm() {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [aiResponse, setAiResponse] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('text', text);
    formData.append('type', 'general');
    if (file) formData.append('file', file);
    const res = await fetch('/api/analyze', { method: 'POST', body: formData });
    const data = await res.json();
    setAiResponse(data.aiResponse);
    if (data.extracted) {
      if (data.extracted.name) setName(data.extracted.name);
      if (data.extracted.date) setDate(data.extracted.date);
    }
  };

  return (
    <div className="border p-4 bg-white rounded shadow space-y-2">
      <h2 className="text-xl font-semibold mb-2">Форма документа</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input type="text" className="w-full border p-2" placeholder="ФИО" value={name} onChange={e => setName(e.target.value)} />
        <input type="text" className="w-full border p-2" placeholder="Дата" value={date} onChange={e => setDate(e.target.value)} />
        <textarea className="w-full border p-2" rows="3" placeholder="Описание" value={text} onChange={e => setText(e.target.value)}></textarea>
        <input type="file" onChange={e => setFile(e.target.files[0])} className="block" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Заполнить</button>
      </form>
      {aiResponse && <p className="mt-2 italic">{aiResponse}</p>}
    </div>
  );
}

function MainPage() {
  const [active, setActive] = useState('civil');
  return (
    <div>
      <div className="flex space-x-2 mb-4">
        <button onClick={() => setActive('civil')} className={`px-4 py-2 rounded ${active === 'civil' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Гражданское</button>
        <button onClick={() => setActive('criminal')} className={`px-4 py-2 rounded ${active === 'criminal' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Уголовное</button>
        <button onClick={() => setActive('admin')} className={`px-4 py-2 rounded ${active === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Административное</button>
        <Link to="/upload" className="ml-auto px-4 py-2 bg-green-600 text-white rounded">Загрузить документ</Link>
      </div>
      {active === 'civil' && <Section type="civil" label="Гражданское судопроизводство" />}
      {active === 'criminal' && <Section type="criminal" label="Уголовное судопроизводство" />}
      {active === 'admin' && <Section type="admin" label="Административное судопроизводство" />}
      <div className="mt-4">
        <Link className="text-blue-600 underline" to="/pages">Перейти к шаблонам</Link>
      </div>
      <FilesList />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <nav className="p-4 bg-gray-200 flex space-x-4 mb-4">
        <Link to="/" className="text-blue-600">Главная</Link>
        <Link to="/upload" className="text-blue-600">Загрузить документ</Link>
        <Link to="/form" className="text-blue-600">Форма</Link>
        <Link to="/pages" className="text-blue-600">Шаблоны</Link>
      </nav>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/form" element={<DocumentForm />} />
        <Route path="/pages" element={<PagesList />} />
        <Route path="/pages/:id" element={<PageView />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.render(<App />, document.getElementById('app'));
