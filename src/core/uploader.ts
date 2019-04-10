import validator from "../core/validator"
import * as multer from "multer"
import * as crypto from "crypto"
import * as path from "path"

export const upload = multer({
  dest: path.join(__dirname, "/../../public/uploads/"),
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, path.join(__dirname, "/../../public/uploads/"))
    },
    filename(req, file, cb) {
      let customFileName = crypto.randomBytes(32).toString("hex")
      let fileExtensionSplit = file.originalname.split(".")

      cb(null, customFileName + "." + fileExtensionSplit[fileExtensionSplit.length - 1])
    }
  }),
  fileFilter: validator.documentFilter
})

export function uploadFields(obj) {
  return upload.fields(obj)
}
export function uploadMultiple(fieldName, maxNumberOfAttachments) {
  return upload.array(fieldName, maxNumberOfAttachments)
}
export function uploadSingle(fieldName) {
  return upload.single(fieldName)
}
