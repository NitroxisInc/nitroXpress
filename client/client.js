window.$ = require("jquery")
require("bootstrap")
require("popper.js")
const { validate } = require("formee")
window.validate = validate
require("./home")()
