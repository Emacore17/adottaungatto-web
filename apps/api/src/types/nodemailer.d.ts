declare module "nodemailer" {
  export type Transporter = {
    close(): void
    sendMail(message: Record<string, unknown>): Promise<unknown>
  }

  const nodemailer: {
    createTransport(options: {
      host: string
      port: number
      secure: boolean
    }): Transporter
  }

  export default nodemailer
}
