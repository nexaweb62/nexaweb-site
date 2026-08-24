// ─── Origines autorisées pour le CORS ───────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://nexaaweb.com',
  'https://www.nexaaweb.com',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
];
// ─────────────────────────────────────────────────────────────────────────────

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const TO_EMAIL = "contact.nexaweb62@gmail.com";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY secret is not set");
    return new Response(
      JSON.stringify({ error: "server_config_error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  let data: Record<string, string | number>;
  try {
    data = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid_json" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const { author_name, message, rating } = data;
  if (!author_name || !message) {
    return new Response(
      JSON.stringify({ error: "missing_required_fields" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const stars = "★".repeat(Math.min(Number(rating) || 0, 5)) +
                "☆".repeat(Math.max(0, 5 - (Math.min(Number(rating) || 0, 5))));

  const now = new Date().toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
       style="background:#ffffff;border-radius:12px;overflow:hidden;
              box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:600px">

  <!-- En-tête -->
  <tr>
    <td style="background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);padding:28px 32px">
      <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:.18em;
                text-transform:uppercase;color:rgba(255,255,255,.65)">Nexa Web</p>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-.02em">
        Nouvel avis client — en attente de validation
      </h1>
    </td>
  </tr>

  <!-- Corps -->
  <tr>
    <td style="padding:28px 32px">
      <p style="margin:0 0 22px;font-size:14px;color:#374151;line-height:1.65">
        Un nouvel avis a été soumis sur nexaaweb.com. Il est actuellement
        <strong>en attente de modération</strong> dans votre tableau Supabase.
      </p>

      <!-- Bloc Avis -->
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
        <tbody>
          <tr>
            <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#6b7280;
                       width:140px;vertical-align:top;white-space:nowrap;
                       border-bottom:1px solid #f3f4f6">Auteur</td>
            <td style="padding:9px 14px;font-size:13px;color:#111118;
                       vertical-align:top;border-bottom:1px solid #f3f4f6">${esc(String(author_name))}</td>
          </tr>
          ${data.company ? `<tr>
            <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#6b7280;
                       width:140px;vertical-align:top;white-space:nowrap;
                       border-bottom:1px solid #f3f4f6">Entreprise</td>
            <td style="padding:9px 14px;font-size:13px;color:#111118;
                       vertical-align:top;border-bottom:1px solid #f3f4f6">${esc(String(data.company))}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#6b7280;
                       width:140px;vertical-align:top;white-space:nowrap;
                       border-bottom:1px solid #f3f4f6">Note</td>
            <td style="padding:9px 14px;font-size:16px;color:#F59E0B;
                       vertical-align:top;border-bottom:1px solid #f3f4f6">${stars} <span style="font-size:12px;color:#6b7280;font-weight:600">${rating}/5</span></td>
          </tr>
        </tbody>
      </table>

      <!-- Message -->
      <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:.14em;
                text-transform:uppercase;color:#9ca3af">Avis</p>
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;
                  margin-bottom:28px;font-size:13px;color:#374151;line-height:1.75;
                  white-space:pre-wrap">${esc(String(message))}</div>

      <!-- CTA -->
      <div style="text-align:center">
        <a href="https://supabase.com/dashboard"
           style="display:inline-block;padding:13px 30px;
                  background:linear-gradient(135deg,#8b5cf6,#7c3aed);
                  color:#ffffff;border-radius:8px;
                  font-size:13px;font-weight:700;text-decoration:none;
                  letter-spacing:.03em">
          Valider ou rejeter sur Supabase →
        </a>
      </div>
    </td>
  </tr>

  <!-- Pied -->
  <tr>
    <td style="padding:14px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">
        Nexa Web · Avis reçu le ${now} · Changez le statut à <strong>published</strong> pour le rendre visible
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  // ── 1. Notification équipe ───────────────────────────────────────────────
  const teamRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    "Nexa Web <contact@nexaaweb.com>",
      to:      [TO_EMAIL],
      subject: `Nouvel avis — ${esc(String(author_name))} — ${stars} (en attente de modération)`,
      html,
    }),
  });

  if (!teamRes.ok) {
    const errBody = await teamRes.text();
    console.error("Resend API error (team):", teamRes.status, errBody);
    return new Response(
      JSON.stringify({ error: "email_send_failed" }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // ── 2. Accusé de réception au reviewer (si e-mail fourni) ───────────────
  const reviewerEmail = String(data.author_email ?? "").trim();
  if (reviewerEmail) {
    const confirmHtml = buildReviewerConfirmHtml(String(author_name), Number(rating), stars);
    const clientRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:     "Nexa Web <contact@nexaaweb.com>",
        to:       [reviewerEmail],
        reply_to: TO_EMAIL,
        subject:  "Merci pour votre avis — Nexa Web",
        html:     confirmHtml,
      }),
    });
    if (!clientRes.ok) {
      console.warn("Resend API error (reviewer confirmation):", clientRes.status, await clientRes.text());
    }
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
});

/* ─────────────────────────────────────────────────────────
   Email 2 — Accusé de réception reviewer
───────────────────────────────────────────────────────── */
function buildReviewerConfirmHtml(name: string, rating: number, stars: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
       style="background:#ffffff;border-radius:12px;overflow:hidden;
              box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:600px">

  <!-- En-tête -->
  <tr>
    <td style="background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);padding:28px 32px">
      <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:.18em;
                text-transform:uppercase;color:rgba(255,255,255,.65)">Nexa Web</p>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-.02em">
        Merci pour votre avis !
      </h1>
    </td>
  </tr>

  <!-- Corps -->
  <tr>
    <td style="padding:32px 32px 24px">
      <p style="margin:0 0 18px;font-size:15px;color:#111118;font-weight:700">
        Bonjour ${esc(name)},
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7">
        Nous avons bien reçu votre avis ${rating > 0 ? `(${stars})` : ""}. Il sera examiné par notre équipe
        et publié sous <strong>24h</strong> s'il est conforme à notre charte.
      </p>
      <p style="margin:0 0 28px;font-size:14px;color:#374151;line-height:1.7">
        Votre retour compte beaucoup — il aide les futurs clients à mieux comprendre
        comment nous travaillons. Merci de nous faire confiance.
      </p>

      <div style="text-align:center;margin-bottom:8px">
        <a href="https://nexaaweb.com/avis"
           style="display:inline-block;padding:13px 30px;
                  background:linear-gradient(135deg,#8b5cf6,#7c3aed);
                  color:#ffffff;border-radius:8px;
                  font-size:13px;font-weight:700;text-decoration:none;
                  letter-spacing:.03em">
          Voir les avis publiés
        </a>
      </div>
    </td>
  </tr>

  <!-- Pied -->
  <tr>
    <td style="padding:14px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">
        Nexa Web · Carvin, Hauts-de-France ·
        <a href="https://nexaaweb.com" style="color:#9ca3af">nexaaweb.com</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/* helpers */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
