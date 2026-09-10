/**
 * Le Functions importano i moduli condivisi senza estensione
 * (`from '../../src/lib/stripe'`), come si usa con un bundler. Node, che i test
 * li esegue davvero, vuole invece il percorso completo. Questo hook colma la
 * differenza al momento della risoluzione, senza piegare il codice di
 * produzione alle esigenze di un test.
 *
 * Va caricato con: node --test --import ./test/registra-hook.mjs test/...
 */
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ESTENSIONI = ['.ts', '.mts', '.js', '.mjs'];

registerHooks({
  resolve(specifier, context, nextResolve) {
    const relativo = specifier.startsWith('./') || specifier.startsWith('../');
    const senzaEstensione = !/\.[a-z0-9]+$/i.test(specifier);

    // Solo il nostro codice: dentro node_modules ci sono moduli CommonJS, e il
    // loader CJS non accetta un file:// al posto di un percorso.
    const nostro = context.parentURL && !context.parentURL.includes('/node_modules/');

    if (relativo && senzaEstensione && nostro) {
      const base = new URL(specifier, context.parentURL);
      for (const ext of ESTENSIONI) {
        const candidato = new URL(base.href + ext);
        if (existsSync(fileURLToPath(candidato))) {
          return nextResolve(candidato.href, context);
        }
      }
    }

    return nextResolve(specifier, context);
  },
});
