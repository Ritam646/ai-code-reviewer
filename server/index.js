import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({limit: '2mb'}));

const PORT = process.env.PORT || 4000;

async function callGroq(prompt, mode = 'default'){
  const url = process.env.GROQ_API_URL;
  const key = process.env.GROQ_API_KEY;

  if (!url || !key){
    return {mock: true, text: `GROQ not configured. Would have sent: ${prompt.slice(0, 100)}${prompt.length>100?"...":""}`};
  }

  const body = {prompt, mode};

  try{
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok){
      const text = await res.text();
      // return a mock response instead of throwing so the app remains usable
      return {mock: true, text: `GROQ request failed with status ${res.status}: ${text}`};
    }

    const json = await res.json();
    return json;
  }catch(err){
    console.error('GROQ request error:', err);
    // Provide a helpful fallback review/generation when network fails
    const snippet = prompt.slice(0, 400);
    const fallbackText = `Unable to reach GROQ API (${err.message}).\n\nFallback brief response:\n${mode === 'code-review' ? `Quick review based on the provided code snippet:\n- Snippet preview: ${snippet}\n- Suggestions: ensure input validation, add unit tests, consider edge cases.` : `Generated code placeholder based on prompt preview:\n// ${snippet.replace(/\n/g,' ')}\nconsole.log('GROQ unreachable; replace with real API key to get full output');`}`;
    return {mock: true, text: fallbackText};
  }
}

app.get('/api/health', (req, res) => {
  res.json({status: 'ok'});
});

app.post('/api/review', async (req, res) => {
  try{
    const {code = '', language = 'unknown', options = {}} = req.body;
    if (!code) return res.status(400).json({error: 'code is required'});

    const prompt = `You are an expert code reviewer. Provide a concise review, highlight bugs, vulnerabilities, performance issues, testing recommendations and suggested fixes. Use markdown.\n\nLanguage: ${language}\n\nCode:\n${code}`;

    const groqResp = await callGroq(prompt, 'code-review');

    // If mock, return the provided mock text (more informative)
    if (groqResp.mock) {
      const reviewText = groqResp.text || `Mock review: no GROQ API configured. Received code length ${code.length}.`;
      return res.json({review: reviewText});
    }

    // Try to extract a sensible text field from the response
    const reviewText = groqResp.text || groqResp.result || JSON.stringify(groqResp);
    res.json({review: reviewText});
  }catch(err){
    console.error(err);
    res.status(500).json({error: err.message});
  }
});

app.post('/api/generate', async (req, res) => {
  try{
    const {description = '', language = 'javascript', options = {}} = req.body;
    if (!description) return res.status(400).json({error: 'description is required'});

    const prompt = `You are an expert ${language} developer. Generate code for the following request. Include only the code and minimal comments.\n\nRequest:\n${description}`;

    const groqResp = await callGroq(prompt, 'code-generation');

    if (groqResp.mock){
      const codeText = groqResp.text || `// Mock generated ${language} code\n// Description: ${description}\nconsole.log('GROQ not configured: set GROQ_API_URL and GROQ_API_KEY in server/.env file');`;
      return res.json({code: codeText});
    }

    const codeText = groqResp.code || groqResp.text || groqResp.result || JSON.stringify(groqResp);
    res.json({code: codeText});
  }catch(err){
    console.error(err);
    res.status(500).json({error: err.message});
  }
});

app.listen(PORT, () => {
  console.log(`AI Code Reviewer server running on port ${PORT}`);
});
