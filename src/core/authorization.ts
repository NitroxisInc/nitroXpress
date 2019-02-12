import { IModels } from "../models/models"
import * as express from "express"
import * as mongoose from "mongoose"
import UserModel, { Roles } from "../models/user"
import { decrypt, convertEnumToStringArray } from "../core/common"
import * as _ from "lodash"
import * as jwt from "jsonwebtoken"
import * as fs from "fs"
import * as path from "path"
import { AuthError, Reason, GenerateResp, StatusCode } from "../core/common-errors"

const privateFile = fs.readFileSync(path.join(__dirname, "/../../localhost.key"), {encoding: "utf8"})
const algo = "HS512"

declare global {
  namespace Express {
    interface Request {
      user: {
        _id: string
        name?: string
        email?: string
        token?: string
        type?: string
        profile?: any
      }
    }
  }
}


export function signJwt(userObj: object) {
  return jwt.sign(userObj, privateFile, {
    algorithm: algo,
    expiresIn: "7d"
  })
}

/**
 * middleware to validate the jsonWebToken
 * only supporting token string to be present in jwt token
 */
export function authorizeByRole(...rolesEnum: Roles[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let token: string = req.header("Authorization") || req.body.token || req.query.token || ""
    token = typeof token !== "undefined" && token.length > 0 ? token.trim() : token
    let roles: string[] = []
    if (!!token) {
      // valid type of authorization is provided
      jwt.verify(token, privateFile, {algorithms: [algo]}, (err, _doc: any) => {
        if (err) {
          if (err.name === "TokenExpiredError") {
            return res.status(StatusCode.auth).json(GenerateResp(err, Reason.authCodeExpired))
          }
          return res.status(StatusCode.auth).json(GenerateResp(err, Reason.invalidAuthCode))
        }
        // allRoles = convertEnumToStringArray(Roles)
        _.each(rolesEnum, e => {
          roles.push(Roles[e])
        })

        // log.info(roles)
        if (_doc) {

          UserModel.findOne({
            _id: _doc._b,
            password: decrypt(_doc._a),
            // type: { $in: roles }
          })
          .then((userObj: any) => {
            if (userObj) {
              if (_.hasIn(userObj, "type")) {
                if (_.indexOf(roles, userObj.type) < 0) {
                  return res.status(StatusCode.forbidden).json(GenerateResp("User not allowed to make this request", Reason.notPermitted))
                }
              }
              else {
                return res.status(StatusCode.auth).json(GenerateResp("Invalid Auth Code found", Reason.invalidAuthCode))
              }

              if (_.hasIn(userObj, "profile")) {
                req.user = userObj["profile"] || {}
                req.user._id = userObj._id
                req.user.type = userObj.type
              }
              next()
            }
            else {
              return res.status(401).json(GenerateResp("No User Found with the given detail", Reason.invalidAuthCode))
            }
          })
          .catch(err => {
            log.error(err)
            return res.status(401).json(GenerateResp(err || err.message, Reason.dbError))
          })

        }
        else {
          return res.status(401).json(GenerateResp("Invalid Authorization Code", Reason.invalidAuthCode))
        }
      })
    }
    else {
      return res.status(400).json(GenerateResp("Authorization Code is required for this request", Reason.authCodeMissing))
    }
  }
}

