import type { OnApplicationShutdown } from "@nestjs/common"
import { Inject, Injectable } from "@nestjs/common"
import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"

import { API_ENV } from "../config/config.module.js"
import type { ApiEnv } from "../config/env.js"

type EmailVerificationMessage = {
  displayName: string
  expiresAt: string
  to: string
  token: string
}

type PasswordResetMessage = {
  displayName: string
  expiresAt: string
  to: string
  token: string
}

type ListingModerationDecision = "approved" | "rejected" | "suspended"

type ListingModerationDecisionMessage = {
  decision: ListingModerationDecision
  displayName: string
  listingSlug: string
  listingTitle: string
  reasonCode: string | null
  reasonText: string | null
  to: string
}

type ListingReportDecisionMessage = {
  decision: ListingModerationDecision
  displayName: string
  listingSlug: string
  listingTitle: string
  reasonCode: string | null
  reasonText: string | null
  reportResolutionStatus: "resolved" | "dismissed"
  to: string
}

type ListingContactRequestMessage = {
  listingId: string
  listingTitle: string
  message: string
  ownerDisplayName: string
  requesterDisplayName: string
  requesterEmail: string
  requesterPhoneE164?: string | null
  to: string
}

@Injectable()
export class MailService implements OnApplicationShutdown {
  private readonly transporter: Transporter

  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {
    this.transporter = nodemailer.createTransport({
      host: env.MAIL_HOST,
      port: env.MAIL_PORT,
      secure: false,
    })
  }

  async sendEmailVerification(message: EmailVerificationMessage) {
    const verificationUrl = new URL("/verify-email", this.env.APP_URL)
    verificationUrl.searchParams.set("token", message.token)

    await this.transporter.sendMail({
      from: this.env.MAIL_FROM,
      to: message.to,
      subject: "Verifica il tuo indirizzo email",
      text: [
        `Ciao ${message.displayName},`,
        "",
        "Conferma il tuo indirizzo email per completare l'attivazione dell'account.",
        verificationUrl.toString(),
        "",
        `Il link scade il ${new Date(message.expiresAt).toLocaleString("it-IT")}.`,
      ].join("\n"),
      html: [
        `<p>Ciao ${escapeHtml(message.displayName)},</p>`,
        "<p>Conferma il tuo indirizzo email per completare l'attivazione dell'account.</p>",
        `<p><a href="${verificationUrl.toString()}">Verifica indirizzo email</a></p>`,
        `<p>Il link scade il ${new Date(message.expiresAt).toLocaleString("it-IT")}.</p>`,
      ].join(""),
    })
  }

  async sendPasswordReset(message: PasswordResetMessage) {
    const resetUrl = new URL("/reset-password", this.env.APP_URL)
    resetUrl.searchParams.set("token", message.token)

    await this.transporter.sendMail({
      from: this.env.MAIL_FROM,
      to: message.to,
      subject: "Reimposta la tua password",
      text: [
        `Ciao ${message.displayName},`,
        "",
        "Abbiamo ricevuto una richiesta di reimpostazione password per il tuo account.",
        resetUrl.toString(),
        "",
        `Il link scade il ${new Date(message.expiresAt).toLocaleString("it-IT")}.`,
        "Se non hai richiesto tu questa operazione, ignora questa email.",
      ].join("\n"),
      html: [
        `<p>Ciao ${escapeHtml(message.displayName)},</p>`,
        "<p>Abbiamo ricevuto una richiesta di reimpostazione password per il tuo account.</p>",
        `<p><a href="${resetUrl.toString()}">Reimposta password</a></p>`,
        `<p>Il link scade il ${new Date(message.expiresAt).toLocaleString("it-IT")}.</p>`,
        "<p>Se non hai richiesto tu questa operazione, ignora questa email.</p>",
      ].join(""),
    })
  }

  async sendListingModerationDecision(
    message: ListingModerationDecisionMessage
  ) {
    const listingUrl = createListingUrl(this.env.APP_URL, message.listingSlug)
    const copy = moderationDecisionCopy(message.decision)
    const reasonLines = moderationReasonLines(message)

    await this.transporter.sendMail({
      from: this.env.MAIL_FROM,
      to: message.to,
      subject: copy.ownerSubject,
      text: [
        `Ciao ${message.displayName},`,
        "",
        copy.ownerText(message.listingTitle),
        ...reasonLines.text,
        "",
        listingUrl,
      ].join("\n"),
      html: [
        `<p>Ciao ${escapeHtml(message.displayName)},</p>`,
        `<p>${escapeHtml(copy.ownerText(message.listingTitle))}</p>`,
        ...reasonLines.html,
        `<p><a href="${listingUrl}">Apri annuncio</a></p>`,
      ].join(""),
    })
  }

  async sendListingReportDecision(message: ListingReportDecisionMessage) {
    const listingUrl = createListingUrl(this.env.APP_URL, message.listingSlug)
    const copy = moderationDecisionCopy(message.decision)
    const resolutionText =
      message.reportResolutionStatus === "dismissed"
        ? "Dopo la revisione, la segnalazione e' stata archiviata."
        : "Dopo la revisione, la segnalazione e' stata risolta."
    const reasonLines = moderationReasonLines(message)

    await this.transporter.sendMail({
      from: this.env.MAIL_FROM,
      to: message.to,
      subject: "Aggiornamento sulla tua segnalazione",
      text: [
        `Ciao ${message.displayName},`,
        "",
        `Abbiamo esaminato la tua segnalazione sull'annuncio "${message.listingTitle}".`,
        resolutionText,
        copy.reportText,
        ...reasonLines.text,
        "",
        listingUrl,
      ].join("\n"),
      html: [
        `<p>Ciao ${escapeHtml(message.displayName)},</p>`,
        `<p>Abbiamo esaminato la tua segnalazione sull'annuncio "${escapeHtml(message.listingTitle)}".</p>`,
        `<p>${escapeHtml(resolutionText)}</p>`,
        `<p>${escapeHtml(copy.reportText)}</p>`,
        ...reasonLines.html,
        `<p><a href="${listingUrl}">Apri annuncio</a></p>`,
      ].join(""),
    })
  }

  async sendListingContactRequest(message: ListingContactRequestMessage) {
    const listingUrl = createListingDetailUrl(
      this.env.APP_URL,
      message.listingId
    )
    const phoneText = message.requesterPhoneE164
      ? ["", `Telefono condiviso: ${message.requesterPhoneE164}`]
      : []
    const phoneHtml = message.requesterPhoneE164
      ? [`<p>Telefono condiviso: ${escapeHtml(message.requesterPhoneE164)}</p>`]
      : []

    await this.transporter.sendMail({
      from: this.env.MAIL_FROM,
      replyTo: message.requesterEmail,
      to: message.to,
      subject: `Nuova richiesta per "${message.listingTitle}"`,
      text: [
        `Ciao ${message.ownerDisplayName},`,
        "",
        `${message.requesterDisplayName} ti ha scritto per l'annuncio "${message.listingTitle}".`,
        "",
        message.message,
        ...phoneText,
        "",
        "Puoi rispondere direttamente a questa email: il tuo indirizzo non e' stato mostrato al richiedente dalla piattaforma.",
        "",
        listingUrl,
      ].join("\n"),
      html: [
        `<p>Ciao ${escapeHtml(message.ownerDisplayName)},</p>`,
        `<p>${escapeHtml(message.requesterDisplayName)} ti ha scritto per l'annuncio "${escapeHtml(message.listingTitle)}".</p>`,
        `<p>${escapeHtml(message.message).replace(/\n/g, "<br />")}</p>`,
        ...phoneHtml,
        "<p>Puoi rispondere direttamente a questa email: il tuo indirizzo non e' stato mostrato al richiedente dalla piattaforma.</p>",
        `<p><a href="${listingUrl}">Apri annuncio</a></p>`,
      ].join(""),
    })
  }

  async onApplicationShutdown() {
    this.transporter.close()
  }
}

function createListingUrl(appUrl: string, listingSlug: string) {
  return new URL(`/annunci/${listingSlug}`, appUrl).toString()
}

function createListingDetailUrl(appUrl: string, listingId: string) {
  return new URL(`/listings/${listingId}`, appUrl).toString()
}

function moderationDecisionCopy(decision: ListingModerationDecision) {
  switch (decision) {
    case "approved":
      return {
        ownerSubject: "Il tuo annuncio e' stato approvato",
        ownerText: (title: string) =>
          `Il tuo annuncio "${title}" e' stato approvato ed e' pubblicato.`,
        reportText:
          "Il team di moderazione ha verificato l'annuncio e non ha applicato restrizioni.",
      }
    case "rejected":
      return {
        ownerSubject: "Il tuo annuncio non e' stato approvato",
        ownerText: (title: string) =>
          `Il tuo annuncio "${title}" non e' stato approvato.`,
        reportText:
          "Il team di moderazione ha rimosso l'annuncio dalla pubblicazione.",
      }
    case "suspended":
      return {
        ownerSubject: "Il tuo annuncio e' stato sospeso",
        ownerText: (title: string) =>
          `Il tuo annuncio "${title}" e' stato sospeso.`,
        reportText:
          "Il team di moderazione ha sospeso l'annuncio dalla pubblicazione.",
      }
  }
}

function moderationReasonLines(message: {
  reasonCode: string | null
  reasonText: string | null
}) {
  const text: string[] = []
  const html: string[] = []

  if (message.reasonCode) {
    text.push("", `Motivo: ${message.reasonCode}`)
    html.push(`<p>Motivo: ${escapeHtml(message.reasonCode)}</p>`)
  }

  if (message.reasonText) {
    text.push("", message.reasonText)
    html.push(`<p>${escapeHtml(message.reasonText)}</p>`)
  }

  return { text, html }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
