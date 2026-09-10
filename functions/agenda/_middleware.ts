import { proteggi } from '../_lib/sezione';

/**
 * /agenda/<slug> — stessa protezione degli articoli, stessa implementazione.
 * Un evento cancellato o mai esistito risponde 404 con Cache-Control: no-store.
 */
export const onRequest = proteggi('agenda');
