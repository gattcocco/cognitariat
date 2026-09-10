import type { RuntimeEnv } from '../../src/lib/supabase-server';

// DISABILITATO DI PROPOSITO (piano §6, review consulente): la versione precedente
// cancellava membership/profilo/utente Supabase anche quando la cancellazione
// dell'abbonamento su Stripe falliva (errore intercettato e ignorato) — rischio concreto
// di un account cancellato localmente con una subscription Stripe ancora attiva e
// addebitante, e senza più il mapping per ritrovarla. Finché la retention matrix non è
// definita (cosa si cancella subito, cosa si anonimizza, cosa va conservato per obblighi
// contabili) questo endpoint non deve eseguire alcuna cancellazione reale.
//
// Il bottone "Elimina il mio account e i miei dati" in src/pages/account.astro è stato
// scollegato da questa route e sostituito con una richiesta via email, finché questa
// funzione non viene reimplementata con la logica corretta (fallire l'intera richiesta
// se la cancellazione su Stripe fallisce, non procedere comunque con i dati locali).
export const onRequestPost: PagesFunction<RuntimeEnv> = async () => {
  return new Response(
    JSON.stringify({
      error: 'La cancellazione automatica dell\'account non è ancora disponibile. Scrivi a cognitariatz@proton.me per richiederla.',
    }),
    { status: 501, headers: { 'content-type': 'application/json' } }
  );
};
