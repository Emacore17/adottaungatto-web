import Link from "next/link"

import { LegalDocument } from "@/components/shared/legal-document"
import { routes } from "@/lib/routes"
import { siteConfig } from "@/lib/config/site"
import { createPageMetadata } from "@/lib/seo/metadata"

export const metadata = createPageMetadata({
  title: "Termini di servizio",
  description: `Condizioni d'uso della piattaforma ${siteConfig.name}.`,
  path: routes.terms,
})

const lastUpdated = "21 giugno 2026"

export default function TermsPage() {
  return (
    <LegalDocument title="Termini di servizio" lastUpdated={lastUpdated}>
      <p>
        Questi termini regolano l&apos;uso di {siteConfig.name}. Usando il sito
        accetti le condizioni descritte di seguito.
      </p>

      <section className="flex flex-col gap-3">
        <h2>Oggetto del servizio</h2>
        <p>
          {siteConfig.name} e&apos; una piattaforma che mette in contatto chi
          offre gatti in adozione responsabile con chi desidera adottarli. Non
          gestiamo la consegna degli animali ne&apos; siamo parte
          dell&apos;accordo tra utenti. Non e&apos; consentita la vendita di
          animali in violazione di legge.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Account</h2>
        <ul>
          <li>Devi avere almeno 18 anni per registrarti.</li>
          <li>
            Sei responsabile della riservatezza delle tue credenziali e delle
            attivita&apos; svolte con il tuo account.
          </li>
          <li>I dati forniti devono essere veritieri e aggiornati.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Regole per gli annunci</h2>
        <ul>
          <li>
            Gli annunci devono essere veritieri, riferiti a gatti realmente
            disponibili e conformi alla legge sul benessere animale.
          </li>
          <li>
            Sono vietati contenuti ingannevoli, offensivi, illeciti o lesivi di
            diritti altrui.
          </li>
          <li>
            Ogni annuncio e&apos; sottoposto a moderazione: possiamo approvarlo,
            rifiutarlo o sospenderlo.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Contatti tra utenti</h2>
        <p>
          Il contatto tra utenti deve avvenire in modo corretto e rispettoso.
          Sono vietati spam, molestie e usi impropri dei recapiti altrui. Puoi
          segnalare annunci o comportamenti scorretti tramite gli strumenti del
          sito.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Responsabilita&apos;</h2>
        <p>
          Agiamo come intermediario tecnico e non garantiamo
          l&apos;identita&apos; degli utenti ne&apos; l&apos;esito delle
          adozioni. Nei limiti consentiti dalla legge, non siamo responsabili
          per accordi, condotte o danni derivanti dai rapporti tra utenti. Ci
          impegniamo a mantenere il servizio funzionante, senza garantirne la
          continuita&apos; assoluta.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Proprieta&apos; intellettuale</h2>
        <p>
          I contenuti che pubblichi restano tuoi, ma ci concedi il diritto di
          mostrarli sul sito per erogare il servizio. Marchi, logo e software
          della piattaforma restano dei rispettivi titolari.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Sospensione e chiusura</h2>
        <p>
          Possiamo sospendere o chiudere account che violano questi termini o la
          legge. Puoi chiudere il tuo account in qualsiasi momento.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Modifiche ai termini</h2>
        <p>
          Possiamo aggiornare questi termini: le modifiche rilevanti saranno
          comunicate sul sito. L&apos;uso continuato dopo l&apos;aggiornamento
          vale come accettazione.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Legge applicabile</h2>
        <p>
          Questi termini sono regolati dalla legge italiana. Per le controversie
          si applica il foro previsto dalla normativa vigente, anche a tutela
          del consumatore.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Contatti</h2>
        <p>
          Per domande sui termini scrivi a{" "}
          <Link href="mailto:supporto@adottaungatto.it">
            supporto@adottaungatto.it
          </Link>
          . Vedi anche la <Link href={routes.privacy}>privacy policy</Link> e la{" "}
          <Link href={routes.cookie}>cookie policy</Link>.
        </p>
      </section>
    </LegalDocument>
  )
}
