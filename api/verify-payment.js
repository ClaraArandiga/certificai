module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const paymentId = req.query.payment_id;
  const expectedSlug = req.query.slug;

  if (!paymentId) {
    res.status(400).json({ ok: false, error: 'missing_payment_id' });
    return;
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    res.status(500).json({ ok: false, error: 'server_misconfigured' });
    return;
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!mpRes.ok) {
      res.status(200).json({ ok: false, error: 'not_found' });
      return;
    }

    const data = await mpRes.json();
    const status = data.status;
    const externalReference = data.external_reference || '';
    const approved = status === 'approved';
    const slugMatches = !expectedSlug || externalReference.indexOf(expectedSlug + '-') === 0;

    res.status(200).json({
      ok: Boolean(approved && slugMatches),
      status,
      external_reference: externalReference,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'server_error' });
  }
};
