export default {
  email (v) {
    return new RegExp(/^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/, "g").test(v)
  },
  password (v) {
    return new RegExp(/^([\w-\.]{8,})?$/, "g").test(v)
  },
  imageFilter (req, file, cb) {
    // accept image only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error("Only image files are allowed!"), false)
    }
    cb(null, true)
  },
  documentFilter (req, file, cb) {
    // accept all types of accepted documents
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|doc|docx|pages|rtf|pdf|xls|xlsx)$/)) {
      return cb(
        new Error("Only jpg, jpeg, png, gif, doc, docx, pages, rtf, pdf, xls or xlsx files are allowed!"),
        false
      )
    }
    cb(null, true)
  }
}
