import { proteggi } from '../_lib/sezione';

/**
 * /blog/<slug> — un articolo cancellato risponde 404 invece di essere servito
 * dallo strato statico di Pages. Il perche', il come e le prove stanno in
 * functions/_lib/sezione.ts: qui non c'e' logica da duplicare.
 */
export const onRequest = proteggi('blog');
