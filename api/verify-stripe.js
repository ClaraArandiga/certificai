module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const sessionId = req.query.session_id;
  const expectedSlug = req.query.slug;

  if (!sessionId) {
    res.status(400).json({ ok: false, error: 'missing_session_id' });
    return;
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    res.status(500).json({ ok: false, error: 'server_misconfigured' });
    return;
  }

  try {
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });

    if (!stripeRes.ok) {
      res.status(200).json({ ok: false, error: 'not_found' });
      return;
    }

    const data = await stripeRes.json();
    const paid = data.payment_status === 'paid';
    const metaSlug = (data.metadata && data.metadata.slug) || '';
    const tier = (data.metadata && data.metadata.tier) || '';
    const slugMatches = !expectedSlug || metaSlug === expectedSlug;

    res.status(200).json({
      ok: Boolean(paid && slugMatches && tier),
      status: data.payment_status,
      tier,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'server_error' });
  }
};
