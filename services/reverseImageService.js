const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');
const { computePHash, computeClipEmbedding, combinedSimilarity } = require('./imageSimilarity');

const SERPER_API_KEY = process.env.SERPER_API_KEY; // free plan available

async function fetchSerperImageResults(query, num = 30) {
  if (!SERPER_API_KEY) throw new Error('Missing SERPER_API_KEY');
  const resp = await axios.post('https://google.serper.dev/images', {
    q: query,
    num,
  }, {
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });
  const items = Array.isArray(resp.data?.images) ? resp.data.images : [];
  // Normalize: { title, source, link, imageUrl, thumbnailUrl }
  return items.map(it => ({
    title: it.title,
    source: it.source,
    link: it.link,
    imageUrl: it.imageUrl || it.image,
    thumbnailUrl: it.thumbnailUrl || it.thumbnail,
  }));
}

async function downloadImageBuffer(url) {
  try {
    const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return Buffer.from(resp.data);
  } catch {
    return null;
  }
}

async function computeImageSignatures(imageBuffer) {
  const [phash, clip] = await Promise.all([
    computePHash(imageBuffer),
    computeClipEmbedding(imageBuffer),
  ]);
  return { phash, clip };
}

async function compareAgainstCandidates(originalBuf, candidates, { clipWeight = 0.5 } = {}) {
  const orig = await computeImageSignatures(originalBuf);

  const scored = [];
  for (const c of candidates) {
    const thumbUrl = c.thumbnailUrl || c.imageUrl;
    if (!thumbUrl) continue;
    const buf = await downloadImageBuffer(thumbUrl);
    if (!buf) continue;
    // Normalize thumbnail to consistent size to improve pHash stability
    const normalized = await sharp(buf).resize(256, 256, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
    const sig = await computeImageSignatures(normalized);
    const { similarity, phashSim, clipSim } = combinedSimilarity({
      phashA: orig.phash, phashB: sig.phash,
      clipA: orig.clip, clipB: sig.clip,
      clipWeight,
    });
    scored.push({ ...c, similarity, phashSim, clipSim });
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return { original: orig, results: scored };
}

async function crawlAndExtractText(url) {
  try {
    const resp = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(resp.data);
    const title = $('title').text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);
    return `${title}\n${metaDesc}\n${text}`.slice(0, 8000);
  } catch {
    return '';
  }
}

async function hfZeroShotClassify(text) {
  // Use hosted free models via inference API (optional). Keep zero dependency if key missing.
  const apiKey = process.env.HF_API_KEY;
  const labels = ['Commercial', 'Educational', 'Safe'];
  if (!apiKey) return { label: 'Safe', score: 0.5, labels: [] };
  try {
    const resp = await axios.post('https://api-inference.huggingface.co/models/facebook/bart-large-mnli', {
      inputs: text.slice(0, 2000),
      parameters: { candidate_labels: labels, multi_label: false },
    }, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 20000,
    });
    const seq = resp.data;
    if (Array.isArray(seq?.labels)) {
      return { label: seq.labels[0], score: seq.scores?.[0] || 0, labels: seq.labels };
    }
  } catch {}
  return { label: 'Safe', score: 0.5, labels: [] };
}

async function analyzeMatch(url, similarity) {
  const text = await crawlAndExtractText(url);
  const classification = await hfZeroShotClassify(text);
  const potentialInfringement = similarity >= 0.8 && classification.label === 'Commercial';
  return { textSnippet: text.slice(0, 500), classification, potentialInfringement };
}

async function reverseImagePipeline({ imageBuffer, query, clipWeight = 0.5, topK = 10 }) {
  // 1) Search Serper
  const results = await fetchSerperImageResults(query, 30);

  // 2) Compare by pHash+CLIP
  const { results: scored } = await compareAgainstCandidates(imageBuffer, results, { clipWeight });
  const top = scored.slice(0, topK);

  // 3) For high matches, crawl + classify
  const enriched = [];
  for (const r of top) {
    if (r.similarity >= 0.8) {
      const extra = await analyzeMatch(r.link || r.imageUrl || r.thumbnailUrl, r.similarity);
      enriched.push({ ...r, ...extra });
    } else {
      enriched.push(r);
    }
  }

  return enriched;
}

module.exports = {
  fetchSerperImageResults,
  compareAgainstCandidates,
  reverseImagePipeline,
};
