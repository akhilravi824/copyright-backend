const axios = require('axios');

async function hfGenerateReasoning(prompt) {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) return 'No reasoning (HF_API_KEY missing).';
  try {
    const resp = await axios.post('https://api-inference.huggingface.co/models/google/flan-t5-small', {
      inputs: prompt.slice(0, 2000)
    }, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 20000 });
    const out = resp.data?.[0]?.generated_text || '';
    return out;
  } catch {
    return '';
  }
}

async function classifyUsage(text) {
  const apiKey = process.env.HF_API_KEY;
  const labels = ['Commercial', 'Educational', 'Safe'];
  if (!apiKey) return { label: 'Safe', score: 0.5, reasoning: 'Default (no API key).' };
  try {
    const resp = await axios.post('https://api-inference.huggingface.co/models/facebook/bart-large-mnli', {
      inputs: text.slice(0, 2000),
      parameters: { candidate_labels: labels, multi_label: false },
    }, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 20000 });
    const seq = resp.data;
    const label = seq?.labels?.[0] || 'Safe';
    const score = seq?.scores?.[0] || 0.5;
    const reasoning = await hfGenerateReasoning(`Classify the following page context as Commercial, Educational, or Safe and explain briefly.\n\nContext:\n${text.slice(0, 800)}\n\nAnswer:`);
    return { label, score, reasoning };
  } catch {
    return { label: 'Safe', score: 0.5, reasoning: '' };
  }
}

module.exports = { classifyUsage };
