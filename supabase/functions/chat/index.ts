// ─── Origines autorisées pour le CORS ───────────────────────────────────────
// Modifier uniquement ce tableau pour ajouter/retirer des domaines.
const ALLOWED_ORIGINS = [
  'https://nexaaweb.com',        // production
  'https://www.nexaaweb.com',    // production (www)
  'http://127.0.0.1:5500',       // dev local VS Code Live Server
  'http://localhost:5500',       // dev local alternatif
];
// ─────────────────────────────────────────────────────────────────────────────

// Rate limiting en mémoire par IP (réinitialisé au cold start — suffisant pour du trafic modéré)
// Pour une protection plus robuste : intégrer Upstash Redis
const ipBucket = new Map<string, { count: number; resetAt: number }>();
const IP_LIMIT = 10;      // requêtes max par fenêtre
const IP_WINDOW = 60_000; // fenêtre d'une minute

function isIpAllowed(ip: string): boolean {
  const now = Date.now();
  const slot = ipBucket.get(ip);
  if (!slot || now > slot.resetAt) {
    ipBucket.set(ip, { count: 1, resetAt: now + IP_WINDOW });
    return true;
  }
  if (slot.count >= IP_LIMIT) return false;
  slot.count++;
  return true;
}

const SYSTEM_PROMPT = `Réponds toujours en français, quelle que soit la langue utilisée par l'interlocuteur.

Tu es l'assistant de NexaWeb, agence web basée à Carvin (Hauts-de-France). Tu réponds uniquement aux questions concernant NexaWeb, ses offres, ses délais et son fonctionnement.

Informations vérifiées que tu peux communiquer :
- Formule Vitrine : 790 €, site 1 à 3 pages, design sur mesure, responsive, formulaire de contact, livré en 7 jours
- Formule Business : 1 490 €, jusqu'à 8 pages, animations premium, référencement local, blog intégré, formation incluse, livré en 7 jours
- Formule Premium : 2 490 €, boutique en ligne complète, paiement sécurisé, gestion des stocks, fiches produits illimitées, livré en 14 jours
- Garantie satisfait ou remboursé 30 jours, sans justification
- Réponse à toute demande de devis sous 24 h
- Agence locale, basée à Carvin

RÈGLES STRICTES :
- N'invente JAMAIS de tarif, de délai, de fonctionnalité ou de référence client qui ne figure pas ci-dessus
- Si on te demande une information que tu n'as pas, réponds que tu ne peux pas répondre avec certitude et invite à remplir le formulaire de devis ou à écrire à contact.nexaweb62@gmail.com
- Ne promets jamais de remise, de délai raccourci ou d'engagement particulier
- Si la question ne concerne pas NexaWeb ou la création de sites web, redirige poliment vers le sujet
- Les projets présentés sur le site sont des maquettes de démonstration réalisées pour illustrer nos compétences, pas des sites livrés à de vrais clients
- Reste concis : 3-4 phrases maximum par réponse
- Tutoie ou vouvoie selon le registre de l'utilisateur, par défaut vouvoiement

Ton : professionnel, chaleureux, direct. Pas de jargon technique inutile.`;

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[ALLOWED_ORIGINS.length - 1]; // fallback = production
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function jsonResp(
  body: unknown,
  status: number,
  extra: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...extra, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  // IP rate limiting
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (!isIpAllowed(ip)) {
    return jsonResp(
      { error: 'rate_limited' },
      429,
      { ...cors, 'Retry-After': '60' }
    );
  }

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY secret is not set');
    return jsonResp({ error: 'server_config_error' }, 500, cors);
  }

  let body: {
    userMessage?: unknown;
    messages?: Array<{ role: string; text: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: 'invalid_json' }, 400, cors);
  }

  const { userMessage, messages = [] } = body;

  if (!userMessage || typeof userMessage !== 'string') {
    return jsonResp({ error: 'missing_user_message' }, 400, cors);
  }
  if (userMessage.length > 500) {
    return jsonResp({ error: 'message_too_long' }, 400, cors);
  }

  // Limiter l'historique à 6 échanges (12 messages) pour économiser les tokens
  const history = Array.isArray(messages) ? messages.slice(-12) : [];

  const contents = [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.text) }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  let geminiRes: Response;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { maxOutputTokens: 250, temperature: 0.5 },
        }),
      }
    );
  } catch (err) {
    console.error('Gemini fetch error:', err);
    return jsonResp({ error: 'ai_unreachable' }, 502, cors);
  }

  if (!geminiRes.ok) {
    const errBody = await geminiRes.text();
    console.error('Gemini API error:', geminiRes.status, errBody);
    return jsonResp({ error: 'ai_error', code: geminiRes.status }, 502, cors);
  }

  const data = await geminiRes.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!reply) {
    return jsonResp({ error: 'empty_response' }, 502, cors);
  }

  return jsonResp({ reply }, 200, cors);
});
