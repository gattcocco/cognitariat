/**
 * Prove del cancello dei pagamenti (Fase 5).
 *
 * Due livelli:
 *  1. il cancello in se' (src/lib/pagamenti.ts): quali valori aprono e quali no;
 *  2. i tre endpoint veri, invocati come li invocherebbe Cloudflare, con `fetch`
 *     sostituito da una funzione che fallisce. Se il blocco lasciasse passare
 *     anche solo la validazione del token o la costruzione di una sessione
 *     Stripe, quella fetch verrebbe chiamata e il test fallirebbe: e' il modo
 *     per dimostrare che non parte nessuna chiamata esterna, non solo che la
 *     risposta ha il codice giusto.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cancelloPagamenti,
  pagamentiAbilitati,
  chiaviMancanti,
  CHIAVI_QUOTA,
  CHIAVI_SOSTENITORE,
  CHIAVI_MERCH,
} from '../src/lib/pagamenti';

import { onRequestPost as checkoutQuota } from '../functions/api/checkout';
import { onRequestPost as checkoutMerch } from '../functions/api/checkout-merch';
import { onRequestPost as checkoutSostenitore } from '../functions/api/checkout-sostenitore';

/** Ambiente completo e plausibile: tutte le variabili presenti, valori finti. */
function ambienteCompleto(extra: Record<string, string> = {}) {
  return {
    PUBLIC_SUPABASE_URL: 'https://esempio.supabase.co',
    PUBLIC_SUPABASE_ANON_KEY: 'anon-finta',
    SUPABASE_SERVICE_ROLE_KEY: 'service-finta',
    STRIPE_SECRET_KEY: 'sk_test_finta',
    STRIPE_WEBHOOK_SECRET: 'whsec_finta',
    STRIPE_PRICE_STUDENTE: 'price_studente',
    STRIPE_PRICE_COGNITARIO: 'price_cognitario',
    STRIPE_PRICE_SOSTENITORE: 'price_sostenitore',
    STRIPE_PRICE_MERCH_TSHIRT: 'price_tshirt',
    STRIPE_PRICE_MERCH_PIN: 'price_pin',
    STRIPE_PRICE_MERCH_POSTER: 'price_poster',
    SITE_URL: 'https://cognitariatzone.org',
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// 1. Il cancello
// ---------------------------------------------------------------------------

test('la bandiera apre solo con la stringa esatta "true"', () => {
  assert.equal(pagamentiAbilitati({ PAGAMENTI_ATTIVI: 'true' }), true);

  for (const valore of ['false', 'False', 'TRUE', 'True', '1', 'si', 'yes', 'on', '', ' true ']) {
    assert.equal(
      pagamentiAbilitati({ PAGAMENTI_ATTIVI: valore }),
      false,
      `"${valore}" non deve aprire i pagamenti`
    );
  }

  assert.equal(pagamentiAbilitati({}), false, 'bandiera assente = pagamenti chiusi');
});

test('bandiera assente: bloccato con motivo "non_attivi", anche se le chiavi ci sono tutte', async () => {
  const esito = cancelloPagamenti(ambienteCompleto(), CHIAVI_QUOTA);
  assert.equal(esito.bloccato, true);
  if (!esito.bloccato) return;

  assert.equal(esito.motivo, 'non_attivi');
  assert.equal(esito.risposta.status, 503);
  assert.match(esito.risposta.headers.get('content-type') ?? '', /application\/json/);
  assert.equal(esito.risposta.headers.get('cache-control'), 'no-store');

  const corpo = (await esito.risposta.json()) as { error: string; pagamenti: string };
  assert.equal(corpo.pagamenti, 'non_attivi');
  assert.match(corpo.error, /sospesi/i);
});

test('bandiera a "false": bloccato allo stesso modo', () => {
  const esito = cancelloPagamenti(ambienteCompleto({ PAGAMENTI_ATTIVI: 'false' }), CHIAVI_QUOTA);
  assert.equal(esito.bloccato, true);
  if (esito.bloccato) assert.equal(esito.motivo, 'non_attivi');
});

test('bandiera accesa ma chiavi Stripe assenti: errore controllato, non un 500 opaco', async () => {
  const parziale = ambienteCompleto({ PAGAMENTI_ATTIVI: 'true' }) as Record<string, string>;
  delete parziale.STRIPE_SECRET_KEY;
  delete parziale.STRIPE_PRICE_COGNITARIO;

  const esito = cancelloPagamenti(parziale, CHIAVI_QUOTA);
  assert.equal(esito.bloccato, true);
  if (!esito.bloccato) return;

  assert.equal(esito.motivo, 'configurazione_incompleta');
  assert.equal(esito.risposta.status, 503);

  const corpo = (await esito.risposta.json()) as { error: string; pagamenti: string };
  assert.equal(corpo.pagamenti, 'configurazione_incompleta');
  // Il messaggio pubblico non deve dire quali variabili mancano.
  assert.doesNotMatch(corpo.error, /STRIPE|SUPABASE|PRICE/i);
});

test('una chiave presente ma vuota conta come mancante', () => {
  const esito = cancelloPagamenti(
    ambienteCompleto({ PAGAMENTI_ATTIVI: 'true', STRIPE_SECRET_KEY: '   ' }),
    CHIAVI_SOSTENITORE
  );
  assert.equal(esito.bloccato, true);
  if (esito.bloccato) assert.equal(esito.motivo, 'configurazione_incompleta');

  assert.deepEqual(chiaviMancanti({ A: '', B: '  ', C: 'x' }, ['A', 'B', 'C', 'D']), [
    'A',
    'B',
    'D',
  ]);
});

test('bandiera accesa e configurazione completa: il cancello lascia passare', () => {
  for (const chiavi of [CHIAVI_QUOTA, CHIAVI_SOSTENITORE, CHIAVI_MERCH]) {
    const esito = cancelloPagamenti(ambienteCompleto({ PAGAMENTI_ATTIVI: 'true' }), chiavi);
    assert.equal(esito.bloccato, false);
  }
});

// ---------------------------------------------------------------------------
// 2. I tre endpoint, con la rete sabotata
// ---------------------------------------------------------------------------

/** Esegue `azione` con `fetch` sostituita da una che esplode se viene chiamata. */
async function senzaRete<T>(azione: () => Promise<T>): Promise<T> {
  const originale = globalThis.fetch;
  let chiamate = 0;
  globalThis.fetch = ((...args: unknown[]) => {
    chiamate++;
    throw new Error(`chiamata di rete non attesa verso ${String(args[0])}`);
  }) as unknown as typeof fetch;
  try {
    const risultato = await azione();
    assert.equal(chiamate, 0, 'nessuna chiamata di rete deve partire con i pagamenti fermi');
    return risultato;
  } finally {
    globalThis.fetch = originale;
  }
}

/**
 * Forma minima del gestore di una Pages Function, per invocarlo dai test senza
 * trascinarsi dietro i tipi globali di Cloudflare (che qui non sono caricati).
 */
type Gestore = (context: {
  request: Request;
  env: Record<string, string>;
}) => Promise<Response>;

/** Contesto minimo, nella forma che passa Cloudflare Pages. */
function contesto(env: Record<string, string>, corpo: unknown, token = 'token-finto') {
  return {
    request: new Request('https://cognitariatzone.org/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(corpo),
    }),
    env,
  };
}

const endpoint: ReadonlyArray<readonly [string, Gestore, Record<string, string>]> = [
  ['quota associativa', checkoutQuota as unknown as Gestore, { tier: 'cognitario' }],
  ['merch', checkoutMerch as unknown as Gestore, { item: 't-shirt' }],
  ['contributo sostenitore', checkoutSostenitore as unknown as Gestore, {}],
];

for (const [nome, funzione, corpo] of endpoint) {
  test(`${nome}: bandiera assente → 503 senza toccare la rete`, async () => {
    const risposta = await senzaRete(() => funzione(contesto(ambienteCompleto(), corpo)));

    assert.equal(risposta.status, 503);
    const dati = (await risposta.json()) as Record<string, unknown>;
    assert.equal(dati.pagamenti, 'non_attivi');
    assert.ok(!('url' in dati), 'non deve mai tornare un url di pagamento');
  });

  test(`${nome}: bandiera a "false" → 503 senza toccare la rete`, async () => {
    const risposta = await senzaRete(() =>
      funzione(contesto(ambienteCompleto({ PAGAMENTI_ATTIVI: 'false' }), corpo))
    );
    assert.equal(risposta.status, 503);
  });

  test(`${nome}: bandiera accesa ma senza chiavi Stripe → 503 senza toccare la rete`, async () => {
    const env = ambienteCompleto({ PAGAMENTI_ATTIVI: 'true' }) as Record<string, string>;
    delete env.STRIPE_SECRET_KEY;

    const risposta = await senzaRete(() => funzione(contesto(env, corpo)));

    assert.equal(risposta.status, 503);
    const dati = (await risposta.json()) as Record<string, unknown>;
    assert.equal(dati.pagamenti, 'configurazione_incompleta');
  });
}
