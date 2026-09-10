import { getCollection, type CollectionEntry } from 'astro:content';
import { bozzeVisibili } from './articoli';

export type Evento = CollectionEntry<'eventi'>;

/** Il fuso in cui la redazione scrive gli orari, e in cui succedono le cose. */
export const FUSO = 'Europe/Rome';

/**
 * Data e ora scritte dalla redazione, tenute per quello che sono.
 *
 * IL PROBLEMA CHE QUESTO FILE ESISTE PER EVITARE. `new Date('2026-10-04T19:00')`
 * interpreta la stringa nel fuso di chi esegue il codice. La build gira su
 * Cloudflare, dove il fuso e' UTC: le 19:00 scritte per Milano diventerebbero le
 * 21:00 in pagina d'estate e le 20:00 d'inverno. La stessa build fatta sul
 * portatile di qualcuno a Milano darebbe 19:00. Cioe' l'ora di un evento
 * dipenderebbe da dove e' stato costruito il sito, che e' il tipo di difetto che
 * si scopre il giorno dell'appuntamento.
 *
 * Qui la stringa non viene mai data in pasto al costruttore di Date. Si spezza,
 * e i pezzi restano numeri: giorno, mese, anno, ore, minuti. Per stampare si
 * usano quei numeri; per `datetime` si aggiunge l'offset di Roma calcolato per
 * quel giorno. Non c'e' nessun momento in cui il fuso della macchina entra nel
 * risultato.
 */
export type Istante = {
  anno: number;
  mese: number;
  giorno: number;
  ore?: number;
  minuti?: number;
};

const RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/;

export function leggiIstante(valore: string | undefined): Istante | undefined {
  if (!valore) return undefined;
  const m = RE.exec(valore.trim());
  if (!m) return undefined;
  const [, a, me, g, h, mi] = m;
  return {
    anno: Number(a),
    mese: Number(me),
    giorno: Number(g),
    ore: h === undefined ? undefined : Number(h),
    minuti: mi === undefined ? undefined : Number(mi),
  };
}

/** Chiave ordinabile: confrontabile come stringa, senza passare da Date. */
export function chiaveOrdine(i: Istante): string {
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${p(i.anno, 4)}-${p(i.mese)}-${p(i.giorno)}T${p(i.ore ?? 0)}:${p(i.minuti ?? 0)}`;
}

/**
 * Offset di Europe/Rome per un certo giorno, come '+02:00' o '+01:00'.
 *
 * Non e' una costante: l'Italia passa all'ora legale l'ultima domenica di marzo
 * e torna indietro l'ultima di ottobre, quindi un evento del 3 ottobre e uno del
 * 3 novembre hanno offset diversi. Scriverlo a mano vorrebbe dire sbagliarlo
 * due volte l'anno.
 *
 * Come si ricava: si prende l'istante come se fosse UTC, si chiede a Intl come
 * lo scriverebbe un orologio di Roma, e si guarda di quanto le due letture
 * differiscono. Nelle due ore del cambio d'ora l'offset puo' risultare quello
 * del lato sbagliato dello scalino: e' un caso che riguarda gli appuntamenti
 * fissati fra le 02:00 e le 03:00 di due notti l'anno, e non vale la pena
 * costruirci sopra.
 */
export function offsetRoma(i: Istante): string {
  const comeUtc = Date.UTC(i.anno, i.mese - 1, i.giorno, i.ore ?? 12, i.minuti ?? 0);
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const parte of f.formatToParts(new Date(comeUtc))) {
    if (parte.type !== 'literal') p[parte.type] = parte.value;
  }
  const aRoma = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    // Intl con hour12:false puo' restituire '24' per la mezzanotte.
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second)
  );
  const minuti = Math.round((aRoma - comeUtc) / 60000);
  const segno = minuti < 0 ? '-' : '+';
  const abs = Math.abs(minuti);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${segno}${p2(Math.floor(abs / 60))}:${p2(abs % 60)}`;
}

/** Valore per l'attributo `datetime` di `<time>`: preciso e leggibile da una macchina. */
export function datetimeIso(i: Istante): string {
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  const data = `${p(i.anno, 4)}-${p(i.mese)}-${p(i.giorno)}`;
  if (i.ore === undefined) return data;
  return `${data}T${p(i.ore)}:${p(i.minuti ?? 0)}:00${offsetRoma(i)}`;
}

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

/**
 * Giorno della settimana senza usare il fuso: l'algoritmo di Sakamoto lavora
 * sui numeri del calendario, quindi non c'e' modo che una Date lo sposti.
 */
export function giornoSettimana(i: Istante): string {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = i.anno;
  const m = i.mese;
  if (m < 3) y -= 1;
  const idx = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + i.giorno) % 7;
  return GIORNI[idx];
}

/** «sabato 3 ottobre 2026» */
export function dataLunga(i: Istante): string {
  return `${giornoSettimana(i)} ${i.giorno} ${MESI[i.mese - 1]} ${i.anno}`;
}

/** «3 ottobre» — per le etichette compatte, dove l'anno e' già nel contesto. */
export function dataBreve(i: Istante): string {
  return `${i.giorno} ${MESI[i.mese - 1]}`;
}

/** «19:00», oppure niente se l'ora non è stata scritta. */
export function ora(i: Istante): string | undefined {
  if (i.ore === undefined) return undefined;
  return `${String(i.ore).padStart(2, '0')}:${String(i.minuti ?? 0).padStart(2, '0')}`;
}

/** Nome del mese in tre lettere, per il quadratino della data. */
export function meseAbbr(i: Istante): string {
  return MESI[i.mese - 1].slice(0, 3);
}

export type EventoLetto = {
  evento: Evento;
  inizio?: Istante;
  fine?: Istante;
  /** Vero quando l'appuntamento non ha una data ma un'etichetta di ricorrenza. */
  ricorrente: boolean;
  /** Momento oltre il quale l'appuntamento è passato, per il confronto lato client. */
  scadeIl?: string;
};

export function leggi(evento: Evento): EventoLetto {
  const inizio = leggiIstante(evento.data.inizio);
  const fine = leggiIstante(evento.data.fine);
  const riferimento = fine ?? inizio;
  return {
    evento,
    inizio,
    fine,
    ricorrente: !inizio,
    // Un evento senza ora di fine scade alla fine del suo giorno: alle 19:00 di
    // sabato l'appuntamento di sabato è in corso, non passato.
    scadeIl: riferimento
      ? datetimeIso(
          fine && fine.ore !== undefined
            ? fine
            : { ...riferimento, ore: 23, minuti: 59 }
        )
      : undefined,
  };
}

/** Solo eventi pubblicati. Mai le bozze, in nessun contesto. */
export async function eventiPubblicati(): Promise<EventoLetto[]> {
  const tutti = await getCollection('eventi');
  return tutti.filter((e) => !e.data.bozza).map(leggi);
}

/** Eventi da costruire come pagine: i pubblicati, più le bozze se la build le include. */
export async function eventiDaCostruire(): Promise<EventoLetto[]> {
  const tutti = await getCollection('eventi');
  return tutti.filter((e) => !e.data.bozza || bozzeVisibili).map(leggi);
}

/**
 * Divisione in tre gruppi, nell'ordine in cui vanno mostrati.
 *
 * Il confine fra «prossimi» e «passati» è calcolato al momento della build, e
 * questo è un limite reale di un sito statico: se nessuno pubblica per un mese,
 * un appuntamento finito resta dalla parte sbagliata. Per questo le pagine
 * dell'agenda rivalutano il confine nel browser, dove la data di oggi è quella
 * vera — vedi lo script in coda a src/pages/agenda/index.astro. Qui si prepara
 * un ordine sensato anche senza JavaScript.
 */
export function raggruppa(eventi: EventoLetto[], adesso = new Date()) {
  const ora = datetimeIso({
    anno: adesso.getFullYear(),
    mese: adesso.getMonth() + 1,
    giorno: adesso.getDate(),
    ore: adesso.getHours(),
    minuti: adesso.getMinutes(),
  });

  const datati = eventi.filter((e) => e.inizio);
  const ricorrenti = eventi.filter((e) => !e.inizio);

  const perData = (a: EventoLetto, b: EventoLetto) =>
    chiaveOrdine(a.inizio!).localeCompare(chiaveOrdine(b.inizio!));

  const prossimi = datati.filter((e) => (e.scadeIl ?? '') >= ora).sort(perData);
  const passati = datati.filter((e) => (e.scadeIl ?? '') < ora).sort((a, b) => perData(b, a));

  return { prossimi, ricorrenti, passati };
}
