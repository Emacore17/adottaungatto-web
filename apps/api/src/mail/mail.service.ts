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

  async onApplicationShutdown() {
    this.transporter.close()
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
