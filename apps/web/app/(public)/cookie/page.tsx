import Link from "next/link"

import { LegalDocument } from "@/components/shared/legal-document"
import { routes } from "@/lib/routes"
import { siteConfig } from "@/lib/config/site"
import { createPageMetadata } from "@/lib/seo/metadata"

export const metadata = createPageMetadata({
  title: "Cookie policy",
  description: `Come ${siteConfig.name} usa cookie e tecnologie simili.`,
  path: routes.cookie,
})

const lastUpdated = "21 giugno 2026"

export default function CookiePage() {
  return (
    <LegalDocument title="Cookie policy" lastUpdated={lastUpdated}>
      <p>
        Questa pagina spiega come {siteConfig.name} usa cookie e tecnologie
        simili. Per il trattamento degli altri dati personali vedi la{" "}
        <Link href={routes.privacy}>privacy policy</Link>.
      </p>

      <section className="flex flex-col gap-3">
        <h2>Cosa sono i cookie</h2>
        <p>
          I cookie sono piccoli file salvati sul tuo dispositivo dal browser.
          Servono a far funzionare il sito, ricordare le preferenze e, se
          autorizzati, a raccogliere statistiche d&apos;uso.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Cookie tecnici necessari</h2>
        <p>
          Sono indispensabili al funzionamento del sito e non richiedono
          consenso. Includono:
        </p>
        <ul>
          <li>
            cookie di sessione per mantenere l&apos;accesso al tuo account;
          </li>
          <li>la preferenza del tema (chiaro/scuro);</li>
          <li>la memorizzazione della tua scelta sui cookie.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Cookie non essenziali</h2>
        <p>
          Cookie analitici o di terze parti vengono installati{" "}
          <strong>solo previo tuo consenso</strong>, raccolto tramite il banner.
          Al momento il sito non installa cookie di profilazione; l&apos;elenco
          aggiornato sara&apos; riportato qui quando attivati.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Gestire il consenso</h2>
        <p>
          Puoi scegliere tra &laquo;Solo necessari&raquo; e &laquo;Accetta
          tutti&raquo; quando compare il banner. Per modificare la scelta in
          seguito puoi cancellare i cookie e i dati del sito dalle impostazioni
          del browser: alla visita successiva il banner riapparira&apos;. Puoi
          anche bloccare i cookie dal browser, ma alcune funzioni potrebbero non
          funzionare correttamente.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Contatti</h2>
        <p>
          Per domande sui cookie scrivi a{" "}
          <Link href="mailto:privacy@adottaungatto.it">
            privacy@adottaungatto.it
          </Link>
          .
        </p>
      </section>
    </LegalDocument>
  )
}
