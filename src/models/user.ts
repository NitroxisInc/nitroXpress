import * as mongoose from "mongoose"
import * as idValidator from "mongoose-id-validator"
import * as autopopulate from "mongoose-autopopulate"
import mongooseSanitize from "../core/sanitize-schema"
import {convertEnumToStringArray} from "../core/common"

const Schema = mongoose.Schema
const ObjectId = mongoose.Types.ObjectId

export enum Roles {
  admin = "admin",
  normalUser = "normalUser",
  paidUser = "paidUser"
}
export const RolesAll = [
  Roles.admin,
  Roles.normalUser,
  Roles.paidUser
]

const mySchema = new Schema(
  {
    email: {
      required: "Email is required",
      index: true,
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      dropDups: true
    },
    // use this for saving any additional information for the user
    profile: mongoose.Schema.Types.Mixed,
    name: String,
    password: {
      required: "Password is required",
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: convertEnumToStringArray(Roles),
      required: "A valid user type is required"
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    resetToken: {
      select: false,
      type: String
    }
  },
  {
    timestamps: true
  }
)

mySchema.plugin(require("mongoose-unique-validator"))
mySchema.plugin(mongooseSanitize, {skip: ["profile"]})
mySchema.plugin(idValidator)
mySchema.plugin(autopopulate)
mySchema.set("toObject", {getters: true})
mySchema.set("toJSON", {getters: true})

export default mongoose.model("User", mySchema)
