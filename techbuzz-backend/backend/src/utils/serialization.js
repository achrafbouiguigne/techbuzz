




function encodeEmbedding(emb) {
  if (!emb || !emb.length) return '';
  const buf = Buffer.alloc(emb.length * 4);
  emb.forEach((v, i) => buf.writeFloatLE(v, i * 4));
  return buf.toString('base64');
}


function decodeEmbedding(b64) {
  if (!b64) return [];
  const buf = Buffer.from(b64, 'base64');
  const out = [];
  for (let i = 0; i < buf.length; i += 4) {
    out.push(buf.readFloatLE(i));
  }
  return out;
}

module.exports = { encodeEmbedding, decodeEmbedding };
