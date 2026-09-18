const PRICES = {
  beleza: { base: 17, bump: 44, downsell: 24 },
  gastronomia: { base: 17, bump: 44, downsell: 24 },
  imagem: { base: 17, bump: 44, downsell: 24 },
  algoritmo: { base: 47, bump: 64 },
};

const LABELS = {
  beleza: 'Certificação Profissional — Beleza & Estética',
  gastronomia: 'Certificação Profissional — Gastronomia',
  imagem: 'Certificação Profissional — Imagem & Mídia',
  algoritmo: 'O Mestre do Algorítimo — Pacote de Certificados',
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const slug = req.query.slug;
  const tier = req.query.tier;
  const prices = PRICES[slug];
  const amount = prices && prices[tier];

  if (!amount) {
    res.status(400).json({ error: 'invalid_slug_or_tier' });
    return;
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  const origin = `https://${req.headers.host}`;
  const successUrl = `${origin}/${slug}/?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/${slug}/`;

  const body = new URLSearchParams();
  body.append('mode', 'payment');
  body.append('success_url', successUrl);
  body.append('cancel_url', cancelUrl);
  body.append('locale', 'pt-BR');
  body.append('line_items[0][quantity]', '1');
  body.append('line_items[0][price_data][currency]', 'brl');
  body.append('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)));
  body.append('line_items[0][price_data][product_data][name]', LABELS[slug] || 'CertificAI');
  body.append('metadata[slug]', slug);
  body.append('metadata[tier]', tier);

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await stripeRes.json();
    if (!stripeRes.ok) {
      res.status(502).json({ error: 'stripe_error' });
      return;
    }

    res.status(200).json({ url: data.url });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
