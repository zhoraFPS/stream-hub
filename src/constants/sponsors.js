/**
 * Sponsoren.
 *
 * Die Logos stammen aus dem Sponsorenband von vfl-bochum.de und liegen unter
 * public/sponsors — bewusst selbst ausgeliefert, damit beim Seitenaufruf keine
 * Verbindung zu fremden Servern entsteht (siehe Datenschutzseite).
 *
 * Alle Dateien sind einfarbige „1c-pos"-Fassungen in Vereinsblau (#07283d).
 * Auf unserer dunklen Fläche wären sie fast unsichtbar, deshalb dreht die
 * Regel `.b-sponsor__logo` sie per Filter ins Helle — bei einfarbigen Marken
 * ergibt das genau die Negativ-Fassung, die eine Marken­richtlinie vorsieht.
 * Liegen die offiziellen „1c-neg"-Dateien vor, gehören die hierher und der
 * Filter kann entfallen.
 *
 * Reihenfolge und Auswahl pflegt die Redaktion hier. Wird daraus später ein
 * CMS-Bereich, wandert diese Liste in die Datenbank.
 */

export const SPONSORS = [
  { name: 'Vonovia',              logo: '/sponsors/vonovia.svg',              url: 'https://www.vonovia.de/' },
  { name: 'Mizuno',               logo: '/sponsors/mizuno.svg',               url: 'https://www.mizuno.eu/' },
  { name: 'MTEL',                 logo: '/sponsors/mtel.svg',                 url: 'https://www.mtel.de/' },
  { name: 'Stadtwerke Bochum',    logo: '/sponsors/stadtwerke-bochum.svg',    url: 'https://www.stadtwerke-bochum.de/' },
  { name: 'Moritz Fiege',         logo: '/sponsors/moritz-fiege.svg',         url: 'https://moritzfiege.de/' },
  { name: 'Knappschaft Kliniken', logo: '/sponsors/knappschaft-kliniken.svg', url: 'https://www.knappschaft-kliniken.de/' },
  { name: 'LVM Versicherung',     logo: '/sponsors/lvm.svg',                  url: 'https://www.lvm.de/' },
  { name: 'Sparkasse Bochum',     logo: '/sponsors/sparkasse-bochum.svg',     url: 'https://www.sparkasse-bochum.de/' },
  { name: 'REWE',                 logo: '/sponsors/rewe.svg',                 url: 'https://www.rewe.de/' },
  { name: 'Sport Auto Plus Ford', logo: '/sponsors/sport-auto-plus.png',      url: 'https://www.sportautoplus.de/' },
];

/**
 * Presenting-Sponsor. Auf vfl-bochum.de trägt der Abschnitt „1848TV" den
 * Zusatz „präsentiert von Sparkasse Bochum" — dieselbe Partnerschaft steht
 * auch in der Kopfzeile von vfl1848.tv.
 */
export const PRESENTING_SPONSOR = SPONSORS.find(s => s.name === 'Sparkasse Bochum');
