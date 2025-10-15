const sharp = require('sharp');
let clipExtractor = null;

async function getClipExtractor() {
  if (process.env.ENABLE_CLIP === 'false') return null;
  if (clipExtractor) return clipExtractor;
  try {
    const { pipeline } = require('@xenova/transformers');
    clipExtractor = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32');
    return clipExtractor;
  } catch (err) {
    return null;
  }
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function dct1D(vector) {
  const N = vector.length;
  const result = new Array(N).fill(0);
  const factor = Math.PI / (2 * N);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += vector[n] * Math.cos((2 * n + 1) * k * factor);
    }
    const alpha = k === 0 ? Math.SQRT1_2 : 1;
    result[k] = sum * alpha;
  }
  return result;
}

function dct2D(matrix) {
  const N = matrix.length;
  const rows = matrix.map(row => dct1D(row));
  const result = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let col = 0; col < N; col++) {
    const column = new Array(N);
    for (let r = 0; r < N; r++) column[r] = rows[r][col];
    const dctCol = dct1D(column);
    for (let r = 0; r < N; r++) result[r][col] = dctCol[r];
  }
  return result;
}

function bitsToHex(bitArray) {
  let hex = '';
  for (let i = 0; i < bitArray.length; i += 4) {
    const nibble = (bitArray[i] << 3) | (bitArray[i + 1] << 2) | (bitArray[i + 2] << 1) | bitArray[i + 3];
    hex += nibble.toString(16);
  }
  return hex;
}

async function computePHash(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
    .resize(32, 32, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const matrix = Array.from({ length: 32 }, () => new Array(32).fill(0));
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      matrix[y][x] = data[y * info.width + x];
    }
  }

  const dct = dct2D(matrix);
  const block = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (x === 0 && y === 0) continue;
      block.push(dct[y][x]);
    }
  }
  const mean = block.reduce((a, b) => a + b, 0) / block.length;
  const bits = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (x === 0 && y === 0) {
        bits.push(dct[0][0] > mean ? 1 : 0);
      } else {
        bits.push(dct[y][x] > mean ? 1 : 0);
      }
    }
  }
  return bitsToHex(bits);
}

function hammingDistance(hexA, hexB) {
  if (!hexA || !hexB || hexA.length !== hexB.length) return 64;
  const nibbleBits = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
  let dist = 0;
  for (let i = 0; i < hexA.length; i++) {
    const a = parseInt(hexA[i], 16);
    const b = parseInt(hexB[i], 16);
    dist += nibbleBits[a ^ b];
  }
  return dist;
}

async function computeClipEmbedding(imageBuffer) {
  const extractor = await getClipExtractor();
  if (!extractor) return null;
  try {
    const output = await extractor(imageBuffer, { pooling: 'mean', normalize: true });
    const arr = Array.from(output.data ? output.data : output);
    return arr;
  } catch (e) {
    return null;
  }
}

function combinedSimilarity({ phashA, phashB, clipA, clipB, clipWeight = 0.5 }) {
  let phashSim = 0;
  if (phashA && phashB) {
    const dist = hammingDistance(phashA, phashB);
    phashSim = 1 - dist / 64;
  }
  let clipSim = 0;
  if (clipA && clipB) {
    clipSim = cosineSimilarity(clipA, clipB);
  }
  const w = Math.max(0, Math.min(1, clipWeight));
  const sim = (1 - w) * phashSim + w * clipSim;
  return { similarity: sim, phashSim, clipSim };
}

module.exports = {
  computePHash,
  hammingDistance,
  computeClipEmbedding,
  cosineSimilarity,
  combinedSimilarity,
};
