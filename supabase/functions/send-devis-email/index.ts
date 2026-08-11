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

  let data: Record<string, string>;
  try {
    data = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid_json" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const { prenom, nom, email } = data;
  if (!prenom || !nom || !email) {
    return new Response(
      JSON.stringify({ error: "missing_required_fields" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const formuleLabels: Record<string, string> = {
    vitrine:  "Vitrine — 790 €",
    business: "Business — 1 490 €",
    premium:  "Premium — 2 490 €",
  };

  const typeSiteLabels: Record<string, string> = {
    vitrine:   "Site vitrine",
    portfolio: "Portfolio",
    ecommerce: "Boutique e-commerce",
    blog:      "Blog / Magazine",
    app:       "Application web",
    refonte:   "Refonte de site existant",
    autre:     "Autre",
  };

  const delaiLabels: Record<string, string> = {
    urgent:   "Dès que possible",
    "1mois":  "Dans 1 mois",
    "3mois":  "Dans 2 à 3 mois",
    flexible: "Flexible",
  };

  const budgetLabels: Record<string, string> = {
    "<500":      "Moins de 500 €",
    "500-1000":  "500 – 1 000 €",
    "1000-2000": "1 000 – 2 000 €",
    "2000+":     "2 000 € et plus",
    nsp:         "Non défini pour l'instant",
  };

  const subject = `Nouvelle demande de devis — ${prenom} ${nom} — ${
    formuleLabels[data.formule] ?? (data.formule || "Formule non précisée")
  }`;

  const html = buildEmailHtml(data, formuleLabels, typeSiteLabels, delaiLabels, budgetLabels);

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      /* ⚠️ Passer à "Nexa Web <devis@nexaaweb.com>" après vérification DNS Resend
         Tant que le domaine n'est pas vérifié, laisser onboarding@resend.dev */
      from:     "Nexa Web <onboarding@resend.dev>",
      to:       [TO_EMAIL],
      reply_to: email,
      subject,
      html,
    }),
  });

  if (!resendRes.ok) {
    const errBody = await resendRes.text();
    console.error("Resend API error:", resendRes.status, errBody);
    return new Response(
      JSON.stringify({ error: "email_send_failed" }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
});

/* ─────────────────────────────────────────────────────────
   Email HTML
───────────────────────────────────────────────────────── */
function buildEmailHtml(
  d: Record<string, string>,
  formuleLabels: Record<string, string>,
  typeSiteLabels: Record<string, string>,
  delaiLabels: Record<string, string>,
  budgetLabels: Record<string, string>,
): string {
  const row = (label: string, value: string | undefined | null) => {
    if (!value) return "";
    return `
      <tr>
        <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#6b7280;
                   width:160px;vertical-align:top;white-space:nowrap;
                   border-bottom:1px solid #f3f4f6">${label}</td>
        <td style="padding:9px 14px;font-size:13px;color:#111118;
                   vertical-align:top;border-bottom:1px solid #f3f4f6">${value}</td>
      </tr>`;
  };

  const siteLink = d.site_existant
    ? `<a href="${esc(d.site_existant)}" style="color:#8b5cf6">${esc(d.site_existant)}</a>`
    : null;

  const replyLink =
    `mailto:${esc(email(d))}?subject=${encodeURIComponent("Re : Votre demande de devis Nexa Web")}`;

  const now = new Date().toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

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
        Nouvelle demande de devis
      </h1>
    </td>
  </tr>

  <!-- Corps -->
  <tr>
    <td style="padding:28px 32px">
      <p style="margin:0 0 22px;font-size:14px;color:#374151;line-height:1.65">
        Une nouvelle demande de devis a été soumise. Répondez directement à
        <a href="mailto:${esc(d.email)}" style="color:#8b5cf6">${esc(d.email)}</a>
        depuis Gmail.
      </p>

      <!-- Bloc Contact -->
      <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:.14em;
                text-transform:uppercase;color:#9ca3af">Contact</p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px">
        <tbody>
          ${row("Prénom", esc(d.prenom))}
          ${row("Nom", esc(d.nom))}
          ${row("E-mail", `<a href="mailto:${esc(d.email)}" style="color:#8b5cf6">${esc(d.email)}</a>`)}
          ${row("Téléphone", esc(d.telephone))}
          ${row("Entreprise", esc(d.entreprise))}
        </tbody>
      </table>

      <!-- Bloc Projet -->
      <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:.14em;
                text-transform:uppercase;color:#9ca3af">Projet</p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px">
        <tbody>
          ${row("Formule", esc(formuleLabels[d.formule] ?? d.formule))}
          ${row("Type de site", esc(typeSiteLabels[d.type_site] ?? d.type_site))}
          ${row("Délai souhaité", esc(delaiLabels[d.delai_souhaite] ?? d.delai_souhaite))}
          ${row("Budget estimé", esc(budgetLabels[d.budget_estime] ?? d.budget_estime))}
          ${row("Site existant", siteLink)}
        </tbody>
      </table>

      <!-- Bloc Description -->
      <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:.14em;
                text-transform:uppercase;color:#9ca3af">Description du projet</p>
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;
                  margin-bottom:28px;font-size:13px;color:#374151;line-height:1.75;
                  white-space:pre-wrap">${esc(d.description)}</div>

      <!-- CTA -->
      <div style="text-align:center">
        <a href="${replyLink}"
           style="display:inline-block;padding:13px 30px;
                  background:linear-gradient(135deg,#8b5cf6,#7c3aed);
                  color:#ffffff;border-radius:8px;
                  font-size:13px;font-weight:700;text-decoration:none;
                  letter-spacing:.03em">
          Répondre à ${esc(d.prenom)}
        </a>
      </div>
    </td>
  </tr>

  <!-- Pied -->
  <tr>
    <td style="padding:14px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">
        Nexa Web · Demande reçue le ${now}
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
function esc(s: string | undefined | null): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* needed because d.email is used before data is destructured in some paths */
function email(d: Record<string, string>): string {
  return d.email ?? "";
}
