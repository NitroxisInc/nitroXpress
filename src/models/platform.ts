import * as mongoose from "mongoose"
import * as idValidator from "mongoose-id-validator"
import * as autopopulate from "mongoose-autopopulate"
import mongooseSanitize from "../core/sanitize-schema"

const Schema = mongoose.Schema
const ObjectId = mongoose.Types.ObjectId

const slideSchema = new Schema({
  img: {
    type: String,
    required: "Img path is required"
  },
  link: {
    type: String,
    default: "#"
  }
})

const mySchema = new Schema(
  {
    slides: [slideSchema],
    privacyPolicyLink: String,
    termsLink: String
  },
  {
    timestamps: true
  }
)

mySchema.plugin(require("mongoose-unique-validator"))
mySchema.plugin(mongooseSanitize)
mySchema.plugin(idValidator)
mySchema.plugin(autopopulate)
mySchema.set("toObject", {getters: true})
mySchema.set("toJSON", {getters: true})

export default mongoose.model("Platform", mySchema, "platform")
