import * as crypto from "crypto"
import * as _ from "lodash"
import * as fs from "fs"
import * as path from "path"
import {fileURLToPath} from "url"
require("dotenv").config()

export function capitalizeWords (val): string {
  return _.startCase(_.capitalize(val))
}

export function convertEnumToStringArray (Enum: any): string[] {
  return Object.keys(Enum).filter((elem) => !_.parseInt(elem) && elem !== "0")
}

export function removeSpace (value: string) {
  return _.replace(value, /\W/gi, "")
}

export function encrypt (obj): string {
  const text = JSON.stringify(obj) || ""
  const cipher = crypto.createCipher("aes-256-ctr", process.env.SECRET)
  let crypted = cipher.update(text, "utf8", "hex")
  crypted += cipher.final("hex")
  return crypted
}

export function decrypt (text: string): string {
  const decipher = crypto.createDecipher("aes-256-ctr", process.env.SECRET)
  let dec = decipher.update(text, "hex", "utf8")
  dec += decipher.final("utf8")
  // let text = ''
  try {
    text = JSON.parse(dec)
  } catch (e) {
    log.error(e)
    text = ""
  }
  return text
}

// return the hashed value of given value
export function hashPassword (value: string): string {
  return value
    ? crypto
      .createHmac("sha512", process.env.SECRET)
      .update(value, "utf8")
      .digest("hex")
    : void 0
}

export function generateToken (value: string = null): string {
  const uniqVal = !value ? new Date().toString() : value
  return crypto
    .createHash("sha256")
    .update(uniqVal.toString(), "utf8")
    .digest("hex")
}

export function randPassword (length: number = 10): string {
  const uniqVal = new Date().getMilliseconds() + process.env.SECRET + new Date().getTime()
  const generatedHash: string[] = crypto
    .createHash("sha256")
    .update(uniqVal.toString(), "utf8")
    .digest("hex")
    .split("")
  const b = _.shuffle(generatedHash)
    .splice(12)
    .join("")
  return b.substr(_.random(1, b.length - length), length)
}
