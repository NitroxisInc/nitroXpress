import * as nodemailer from "nodemailer"
const myApp = require("../../package.json")

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
    user: "hammad@nitroxis.com",
    pass: "jpgzxhzgpqpvdgyh"
  }
}

const transport = nodemailer.createTransport({
  sendmail: true,
  path: "/usr/sbin/sendmail"
} as any)

const gmailTransport = nodemailer.createTransport(smtpConfig)

export const sendMail = function(to: string, subject: string, html: string) {

  gmailTransport.sendMail({
    replyTo: "info@isvmarket.com",
    from: `noreply-${myApp.name}@isvmarket.com`,
    to,
    subject: `ISV Market :: ${subject}`,
    html
  }, (err, info) => {
    if (err) {
      log.error(err)
    }
    return info
  })

}

export default sendMail
