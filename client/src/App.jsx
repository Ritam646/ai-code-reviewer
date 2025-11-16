import React, {useState, useEffect, useRef} from 'react';

function Header(){
  return (
    <header className="header">
      <div className="brand">AI Code Reviewer</div>
      <div className="subtitle">Review and generate code with GROQ-powered AI</div>
    </header>
  );
}

function Panel({title, children}){
  return (
    <div className="panel">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Sidebar({history, onSelect, stats}){
  return (
    <aside className="sidebar">
      <div className="card">
        <strong>Stats</strong>
        <div style={{marginTop:8,color:'var(--muted)'}}>
          <div>Reviews: {stats.reviews}</div>
          <div>Generations: {stats.generations}</div>
        </div>
      </div>

      <div className="card">
        <strong>History</strong>
        <div className="history-list">
          {history.length===0 && <div style={{color:'var(--muted)',marginTop:8}}>No history yet</div>}
          {history.map((h, i)=> (
            <div key={i} className="history-item" onClick={()=>onSelect(h)}>
              <div>{h.type === 'review' ? 'Review' : 'Generate'} — {h.language || h.lang || ''}</div>
              <small>{new Date(h.t).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function App(){
  const [tab, setTab] = useState('review');
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({reviews:0,generations:0});

  useEffect(()=>{
    const raw = localStorage.getItem('acr_history');
    if (raw) {
      try{const parsed = JSON.parse(raw); setHistory(parsed); setStats({reviews: parsed.filter(x=>x.type==='review').length, generations: parsed.filter(x=>x.type==='generate').length})}catch(e){console.warn(e)}
    }
  },[]);

  function addHistory(entry){
    const next = [entry, ...history].slice(0,80);
    setHistory(next);
    localStorage.setItem('acr_history', JSON.stringify(next));
    setStats({reviews: next.filter(x=>x.type==='review').length, generations: next.filter(x=>x.type==='generate').length});
  }

  function handleSelect(h){
    if (h.type === 'review'){ setTab('review'); window.dispatchEvent(new CustomEvent('acr.loadReview', {detail: h})) }
    else { setTab('generate'); window.dispatchEvent(new CustomEvent('acr.loadGenerate', {detail: h})) }
  }

  return (
    <div className="app-root">
      <Header />
      <main className="container">
        <nav className="tabs">
          <button className={tab==='review'? 'active':''} onClick={()=>setTab('review')}>Review</button>
          <button className={tab==='generate'? 'active':''} onClick={()=>setTab('generate')}>Generate</button>
        </nav>

        <div className="layout">
          <div className="main">
            {tab === 'review' ? <ReviewView onAddHistory={addHistory}/> : <GenerateView onAddHistory={addHistory}/>}
            <footer className="footer">Configure the backend `GROQ_API_URL` and `GROQ_API_KEY` in `server/.env`.</footer>
          </div>

          <Sidebar history={history} onSelect={handleSelect} stats={stats} />
        </div>
      </main>
    </div>
  );
}

function useAcrLoader(setInputs){
  useEffect(()=>{
    function onLoad(e){ setInputs(e.detail) }
    window.addEventListener('acr.loadReview', onLoad);
    window.addEventListener('acr.loadGenerate', onLoad);
    return ()=>{ window.removeEventListener('acr.loadReview', onLoad); window.removeEventListener('acr.loadGenerate', onLoad) }
  },[setInputs]);
}

function ReviewView({onAddHistory}){
  const [code, setCode] = useState(`function greet(name){\n  return 'Hello, ' + name;\n}`);
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const langRef = useRef('markdown');

  useAcrLoader(({code: c, language: l})=>{
    if (c) setCode(c); if (l) setLanguage(l);
  });

  useEffect(()=>{ if (window.Prism) window.Prism.highlightAll(); },[result]);

  async function submit(){
    setLoading(true);
    setResult('');
    try{
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({code, language})
      });
      const json = await res.json();
      const text = json.review || JSON.stringify(json);
      setResult(text);
      langRef.current = 'markdown';
      onAddHistory({type:'review', code, result: text, language, t: Date.now()});
    }catch(err){
      setResult('Error: '+err.message);
    }finally{setLoading(false)}
  }

  function copyResult(){ navigator.clipboard.writeText(result || '') }
  function clearAll(){ setCode(''); setResult(''); }

  return (
    <Panel title="Code Review">
      <label>Language</label>
      <input value={language} onChange={e=>setLanguage(e.target.value)} />

      <label>Code</label>
      <textarea value={code} onChange={e=>setCode(e.target.value)} rows={10} />

      <div className="row">
        <button onClick={submit} disabled={loading}>{loading? 'Reviewing...':'Run Review'}</button>
        <button onClick={clearAll}>Clear</button>
      </div>

      <label>Review</label>
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
        <button onClick={copyResult}>Copy</button>
      </div>
      <pre className="output"><code className={`language-${langRef.current}`}>{result}</code></pre>
    </Panel>
  );
}

function GenerateView({onAddHistory}){
  const [description, setDescription] = useState('Create a function that returns the nth fibonacci number');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const langRef = useRef('javascript');

  useAcrLoader(({description: d, language: l, code: c})=>{
    if (d) setDescription(d); if (l) setLanguage(l); if (c) setCode(c);
  });

  useEffect(()=>{ if (window.Prism) window.Prism.highlightAll(); },[code]);

  async function submit(){
    setLoading(true);
    setCode('');
    try{
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({description, language})
      });
      const json = await res.json();
      const txt = json.code || JSON.stringify(json);
      setCode(txt);
      langRef.current = language || 'javascript';
      onAddHistory({type:'generate', description, code: txt, language, t: Date.now()});
    }catch(err){
      setCode('Error: '+err.message);
    }finally{setLoading(false)}
  }

  function copyCode(){ navigator.clipboard.writeText(code || '') }
  function downloadCode(){
    const blob = new Blob([code || ''], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `generated.${language||'txt'}`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  return (
    <Panel title="Code Generator">
      <label>Language</label>
      <input value={language} onChange={e=>setLanguage(e.target.value)} />

      <label>Request</label>
      <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} />

      <div className="row">
        <button onClick={submit} disabled={loading}>{loading? 'Generating...':'Generate Code'}</button>
        <button onClick={()=>{setCode(''); setDescription('');}}>Clear</button>
      </div>

      <div style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
        <button onClick={copyCode}>Copy</button>
        <button onClick={downloadCode}>Download</button>
      </div>

      <label>Generated Code</label>
      <pre className="output"><code className={`language-${langRef.current}`}>{code}</code></pre>
    </Panel>
  );
}
