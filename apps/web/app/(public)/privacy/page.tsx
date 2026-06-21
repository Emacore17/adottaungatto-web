import Link from "next/link"

import { LegalDocument } from "@/components/shared/legal-document"
import { routes } from "@/lib/routes"
import { siteConfig } from "@/lib/config/site"
import { createPageMetadata } from "@/lib/seo/metadata"

export const metadata = createPageMetadata({
  title: "Privacy policy",
  description: `Informativa sul trattamento dei dati personali di ${siteConfig.name}.`,
  path: routes.privacy,
})

const lastUpdated = "21 giugno 2026"

export default function PrivacyPage() {
  return (
    <LegalDocument title="Informativa sulla privacy" lastUpdated={lastUpdated}>
      <p>
        Questa informativa descrive come {siteConfig.name} tratta i dati
        personali degli utenti ai sensi del Regolamento (UE) 2016/679 (GDPR) e
        della normativa italiana applicabile.
      </p>

      <section className="flex flex-col gap-3">
        <h2>Titolare del trattamento</h2>
        <p>
          Titolare del trattamento e&apos; <strong>[ragione sociale]</strong>,
          [indirizzo], P. IVA [numero]. Per qualsiasi richiesta sui tuoi dati
          puoi scrivere a{" "}
          <Link href="mailto:privacy@adottaungatto.it">
            privacy@adottaungatto.it
          </Link>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Dati che raccogliamo</h2>
        <ul>
          <li>
            <strong>Dati dell&apos;account</strong>: indirizzo email, nome
            visualizzato e password (conservata solo in forma cifrata).
          </li>
          <li>
            <strong>Dati degli annunci</strong>: testo, foto, luogo indicativo
            e, se scegli di fornirlo, un recapito telefonico.
          </li>
          <li>
            <strong>Dati di contatto</strong>: i messaggi che invii o ricevi
            tramite il form di contatto tra utenti.
          </li>
          <li>
            <strong>Dati tecnici</strong>: indirizzo IP, log delle richieste e
            identificativi tecnici usati per sicurezza, anti-abuso e
            diagnostica.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Finalita&apos; e basi giuridiche</h2>
        <ul>
          <li>
            Erogazione del servizio (creazione account, pubblicazione annunci,
            contatti): esecuzione di un contratto.
          </li>
          <li>
            Sicurezza, prevenzione abusi e moderazione: legittimo interesse del
            titolare e degli utenti.
          </li>
          <li>
            Comunicazioni non essenziali (es. email facoltative): solo previo
            tuo consenso, revocabile in ogni momento.
          </li>
          <li>Adempimenti di legge: obbligo legale.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Comunicazione dei dati</h2>
        <p>
          I dati possono essere trattati da fornitori che ci supportano
          (hosting, invio email, archiviazione immagini), nominati responsabili
          del trattamento e vincolati alla riservatezza. Non vendiamo i tuoi
          dati personali. I dati degli annunci pubblicati sono visibili
          pubblicamente per loro natura.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Dove trattiamo i dati</h2>
        <p>
          I dati sono trattati su infrastrutture situate nell&apos;Unione
          Europea. Eventuali trasferimenti verso paesi terzi avvengono solo con
          adeguate garanzie previste dal GDPR.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Conservazione</h2>
        <p>
          Conserviamo i dati dell&apos;account finche&apos; resta attivo e per
          il tempo necessario agli obblighi di legge. I log tecnici sono
          conservati per un periodo limitato. Alla cancellazione
          dell&apos;account i dati personali vengono rimossi o anonimizzati,
          salvo quanto la legge imponga di conservare.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>I tuoi diritti</h2>
        <p>
          Puoi esercitare i diritti di accesso, rettifica, cancellazione,
          limitazione, opposizione e portabilita&apos; scrivendo a{" "}
          <Link href="mailto:privacy@adottaungatto.it">
            privacy@adottaungatto.it
          </Link>
          . Hai inoltre diritto di proporre reclamo al Garante per la protezione
          dei dati personali (
          <Link href="https://www.garanteprivacy.it">garanteprivacy.it</Link>).
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Cookie</h2>
        <p>
          Per l&apos;uso dei cookie e tecnologie simili consulta la{" "}
          <Link href={routes.cookie}>cookie policy</Link>.
        </p>
      </section>
    </LegalDocument>
  )
}
