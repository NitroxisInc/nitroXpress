import * as nodemailer from "nodemailer"
require("dotenv").config()

const smtpConfig = {
  host: "smtp.gmail.com",
  port: 465,
  // TLS: true,
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  },
  secure: true, // use SSL
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
}

const transport = nodemailer.createTransport({
  sendmail: true,
  path: "/usr/sbin/sendmail"
} as any)

const gmailTransport = nodemailer.createTransport(smtpConfig)

export const sendMail = function(to: string, subject: string, html: string, attachments = []) {
  gmailTransport.sendMail(
    {
      replyTo: `noreply-${process.env.ADMIN_EMAIL}`,
      from: `${process.env.ADMIN_EMAIL}`,
      to,
      subject: `${process.env.APP_NAME} :: ${subject}`,
      html,
      attachments
    },
    (err, info) => {
      if (err) {
        log.error(err)
      }
      return info
    }
  )
}

export default sendMail
