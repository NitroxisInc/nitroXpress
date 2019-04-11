import {GenerateResp, Reason, StatusCode} from "./common-errors"
import {parseInt as asInt} from "lodash"
import {Response} from "express"

export default (err, req, res, next) => {
  const finalMsg = ""
  let finalField = null
  let reason = null
  let statusCode = 400

  const codeRegex = new RegExp("#([^\\s]+)")
  const reasonRegex = new RegExp("@([^\\s]+)")
  const fieldRegex = new RegExp("'([^']+)'")
  const consecutiveSpaces = new RegExp("[\\s]{2,}")

  if (typeof err === "string") {
    // finalMsg
    if (err.toString().match(new RegExp("'")) !== null) {
      [, finalField] = err.match(fieldRegex)
    }

    if (err.toString().match(new RegExp("@")) !== null) {
      [, reason] = err.match(reasonRegex)
    }
    
    if (err.toString().match(new RegExp("#")) !== null) {
      const [, statusCoded] = err.match(codeRegex)
      err = err.replace(codeRegex, "")
      statusCode = asInt(statusCoded)
    }
    err = err.replace(consecutiveSpaces, " ").trim()
  }
  else if (typeof err === "object") {
    if (err.message.match(new RegExp("`")) !== null) {
      [, finalField] = err.message.match(new RegExp("`([^`]+)`"))
    }
  }
  if (finalField) {
    res.status(statusCode).json(GenerateResp(err.message || err, reason || Reason.serverError, finalField))
  }
  else {
    res.status(statusCode).json(GenerateResp(err.message || err, reason || Reason.serverError))
  }
}
