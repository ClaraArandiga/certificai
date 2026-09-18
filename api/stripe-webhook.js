const crypto = require('crypto');

function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    if (k === 't') acc.t = v;
    if (k === 'v1') { acc.v1 = acc.v1 || []; acc.v1.push(v); }
    return acc;
  }, {});
  if (!parts.t || !parts.v1 || !parts.v1.length) return false;

  const signedPayload = `${parts.t}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');

  return parts.v1.some((sig) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    } catch (e) {
      return false;
    }
  });
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await readRawBody(req);
  const sigHeader = req.headers['stripe-signature'];

  if (!secret || !verifyStripeSignature(rawBody, sigHeader, secret)) {
    res.status(400).json({ error: 'invalid_signature' });
    return;
  }

  res.status(200).json({ received: true });
};

module.exports.config = { api: { bodyParser: false } };
