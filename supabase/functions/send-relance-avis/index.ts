import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement
// par le runtime Supabase Edge Functions.
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY            = Deno.env.get('RESEND_API_KEY')!;

const SITE_URL = 'https://nexaaweb.com';
const TO_NEXA  = 'contact.nexaweb62@gmail.com';

Deno.serve(async () => {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY non configuré');
    return new Response(JSON.stringify({ error: 'server_config_error' }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Sélectionne les projets livrés depuis ≥ 7 jours, relance non encore envoyée ──
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: demandes, error: queryErr } = await supabase
    .from('demandes_devis')
    .select('id, prenom, nom, email')
    .not('livre_le', 'is', null)          // livre_le renseigné = site livré au client
    .lte('livre_le', cutoff)              // livré depuis au moins 7 jours
    .eq('avis_relance_envoyee', false);   // relance pas encore envoyée

  if (queryErr) {
    console.error('Erreur requête DB:', queryErr);
    return new Response(JSON.stringify({ error: queryErr.message }), { status: 500 });
  }

  const results = { eligible: demandes?.length ?? 0, sent: 0, errors: 0 };

  for (const d of (demandes ?? [])) {
    try {
      // ── Envoie l'e-mail de relance ────────────────────────────────────────
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:     'Nexa Web <contact@nexaaweb.com>',
          to:       [d.email],
          reply_to: TO_NEXA,
          subject:  `${d.prenom}, votre retour nous aide vraiment`,
          html:     buildRelanceHtml(d),
        }),
      });

      if (!emailRes.ok) {
        console.error(`Resend error (id ${d.id}):`, await emailRes.text());
        results.errors++;
        continue;
      }

      // ── Passe le flag à true uniquement après envoi réussi ───────────────
      const { error: updateErr } = await supabase
        .from('demandes_devis')
        .update({ avis_relance_envoyee: true })
        .eq('id', d.id);

      if (updateErr) {
        console.error(`Flag update failed (id ${d.id}):`, updateErr);
        results.errors++;
      } else {
        results.sent++;
        console.log(`Relance envoyée : ${d.email} (id ${d.id})`);
      }
    } catch (e) {
      console.error(`Erreur inattendue (id ${d.id}):`, e);
      results.errors++;
    }
  }

  console.log('Résumé relance avis :', results);
  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

/* ─────────────────────────────────────────────────────────
   Email de relance — HTML
───────────────────────────────────────────────────────── */
function buildRelanceHtml(d: { prenom: string; nom: string }): string {
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
        Votre site est en ligne — et votre avis compte.
      </h1>
    </td>
  </tr>

  <!-- Corps -->
  <tr>
    <td style="padding:32px 32px 24px">
      <p style="margin:0 0 16px;font-size:15px;color:#111118;font-weight:700">
        Bonjour ${esc(d.prenom)},
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.75">
        Votre projet est maintenant terminé et votre site est en ligne.
        Nous espérons qu'il vous apporte déjà de nouveaux clients.
      </p>
      <p style="margin:0 0 28px;font-size:14px;color:#374151;line-height:1.75">
        Si vous avez une minute, votre retour d'expérience nous aide énormément —
        il permet aux futurs clients de comprendre comment nous travaillons,
        et c'est le meilleur soutien que vous puissiez nous apporter.
      </p>

      <p style="margin:0 0 24px;font-size:28px;text-align:center;letter-spacing:4px;color:#F59E0B">
        ★★★★★
      </p>

      <div style="text-align:center;margin-bottom:28px">
        <a href="${SITE_URL}/avis"
           style="display:inline-block;padding:14px 36px;
                  background:linear-gradient(135deg,#8b5cf6,#7c3aed);
                  color:#ffffff;border-radius:8px;
                  font-size:13px;font-weight:700;text-decoration:none;
                  letter-spacing:.03em">
          Laisser mon avis →
        </a>
      </div>

      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;text-align:center">
        Cela prend moins de 2 minutes. Pas de compte requis.
      </p>
    </td>
  </tr>

  <!-- Pied -->
  <tr>
    <td style="padding:14px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">
        Nexa Web · Carvin, Hauts-de-France ·
        <a href="${SITE_URL}" style="color:#9ca3af">nexaaweb.com</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
