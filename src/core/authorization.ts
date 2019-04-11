import * as express from "express"
import UserModel, {Roles} from "../models/user"
import {decrypt} from "../core/common"
import * as _ from "lodash"
import * as jwt from "jsonwebtoken"
import log from "../log"
import myLanguage from "../language"
import {Reason, GenerateResp, StatusCode} from "../core/common-errors"

const privateFile = process.env.SECRET

const algo = "HS512"

declare global {
  namespace Express {
    interface Request {
      user: {
        _id: string;
        email: string;
        token?: string;
        profile?: any;
        type?: Roles;
      };
    }
  }
}

export function signJwt (objToSign: object, expiresIn: string | null = null) {
  const jwtOptions: any = {
    algorithm: algo
  }

  if (expiresIn) {jwtOptions.expiresIn = expiresIn}
  return jwt.sign(objToSign, privateFile, jwtOptions)
}

export function ifLoggedInThenRedirect (elsePath: string = "/") {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session.token) {
      next()
    } else {res.redirect(elsePath)}
  }
}

export function authorizeByRoleElseRedirect (failurePath: string, ...rolesEnum: Roles[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let token: string = req.header("Authorization") || req.session.token || req.body.token || req.query.token || ""
    token = typeof token !== "undefined" && token.length > 0 ? token.trim() : token
    const roles: string[] = []
    if (token) {
      // valid type of authorization is provided
      jwt.verify(token, privateFile, {algorithms: [algo]}, (err, _doc: any) => {
        if (err) {
          req.session.errors = (req.session.errors || []).concat(err.message || err).concat(err.message || err)
          return req.session.save(() => {
            res.redirect(failurePath)
          })
        }

        _.each(rolesEnum, (e) => {
          roles.push(Roles[e])
        })

        // log.info(roles)
        if (_doc) {
          UserModel.findOne({
            _id: _doc._b,
            password: decrypt(_doc._a),
            type: {$in: roles}
          })
            .then((userObj: any) => {
              if (userObj) {
                if (!_.hasIn(userObj, "type") || _.indexOf(roles, userObj.type) < 0) {
                  req.session.errors = (req.session.errors || []).concat(myLanguage.userForbidden)
                  return req.session.save(() => {
                    res.status(StatusCode.forbidden)
                    res.redirect(failurePath)
                  })
                } // else {
                // req.session.errors = (req.session.errors || []).concat(myLanguage.authRequired)
                // return req.session.save(() => {
                //   res.status(StatusCode.auth)
                //   res.redirect(failurePath)
                // })
                // }

                if (_.hasIn(userObj, "profile")) {
                  req.user = {...req.user,
                    _id: userObj._id,
                    type: userObj.type}
                  req.user.profile = userObj.profile || {}
                }
                next()
              } else {
                req.session.errors = (req.session.errors || []).concat(myLanguage.authRequired)
                return req.session.save(() => {
                  res.status(StatusCode.auth)
                  res.redirect(failurePath)
                })
              }
            })
            .catch((err) => {
              log.error(err)
              req.session.errors = (req.session.errors || []).concat(myLanguage.dbConnection)
              return req.session.save(() => {
                res.status(StatusCode.auth)
                res.redirect(failurePath)
              })
            })
        } else {
          req.session.errors = (req.session.errors || []).concat(myLanguage.authInvalid)
          return req.session.save(() => {
            res.status(StatusCode.auth)
            res.redirect(failurePath)
          })
        }
      })
    } else {
      req.session.errors = (req.session.errors || []).concat(myLanguage.authInvalid)
      return req.session.save(() => {
        res.status(StatusCode.auth)
        res.redirect(failurePath)
      })
    }
  }
}

/**
 * middleware to validate the jsonWebToken
 * only supporting token string to be present in jwt token
 */
export function authorizeByRoleElseStatus (...rolesEnum: Roles[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let token: string = req.header("Authorization") || req.body.token || req.query.token || ""
    token = typeof token !== "undefined" && token.length > 0 ? token.trim() : token
    const roles: string[] = []
    if (token) {
      // valid type of authorization is provided
      jwt.verify(token, privateFile, {algorithms: [algo]}, (err, _doc: any) => {
        if (err) {
          if (err.name === "TokenExpiredError") {
            return res.status(StatusCode.auth).json(GenerateResp(err, Reason.authCodeExpired))
          }
          return res.status(StatusCode.auth).json(GenerateResp(err, Reason.invalidAuthCode))
        }
        // allRoles = convertEnumToStringArray(Roles)
        _.each(rolesEnum, (e) => {
          roles.push(Roles[e])
        })

        // log.info(roles)
        if (_doc) {
          UserModel.findOne({
            _id: _doc._b,
            password: decrypt(_doc._a),
            type: {$in: roles}
          })
            .then((userObj: any) => {
              if (userObj) {
                if (_.hasIn(userObj, "type")) {
                  if (_.indexOf(roles, userObj.type) < 0) {
                    return res
                      .status(StatusCode.forbidden)
                      .json(GenerateResp("User not allowed to make this request", Reason.notPermitted))
                  }
                } else {
                  return res
                    .status(StatusCode.auth)
                    .json(GenerateResp("Invalid Auth Code found", Reason.invalidAuthCode))
                }

                if (_.hasIn(userObj, "profile")) {
                  req.user = userObj.profile || {}
                  req.user._id = userObj._id
                  req.user.type = userObj.type
                }
                next()
              } else {
                return res.status(401).json(GenerateResp("No User Found with the given detail", Reason.invalidAuthCode))
              }
            })
            .catch((err) => {
              log.error(err)
              return res.status(401).json(GenerateResp(err || err.message, Reason.dbError))
            })
        } else {
          return res.status(401).json(GenerateResp(myLanguage.authInvalid, Reason.invalidAuthCode))
        }
      })
    } else {
      return res.status(400).json(GenerateResp(myLanguage.authRequired, Reason.authCodeMissing))
    }
  }
}
