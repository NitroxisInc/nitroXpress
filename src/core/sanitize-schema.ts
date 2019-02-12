import * as traverse from "traverse"
import * as sanitizer from "sanitizer"
import * as mongoose from "mongoose"
import * as _ from "lodash"

export default function mongooseSanitize(schema, options : any = {}) {
  options = options || {}
  options.include = _.has(options, "include") && _.isArray(options.include) ? options.include : []
  options.skip = _.has(options, "skip") && _.isArray(options.skip) ? options.skip : []

  schema.pre("save", function (next) {
    let doc = JSON.parse(JSON.stringify(this._doc))

    if (options.include.length < 1) {
      // Sanitize every field by default:
      options.include = Object.keys(this._doc)
    }
    
    // Sanitize every node in tree:
    let sanitized = traverse(doc).map(function (node) {

      if (typeof node === "string") {
        let sanitizedNode = sanitizer.sanitize(sanitizer.escape(node))
        this.update(sanitizedNode)
        // this.update(node)
      }
    })
    
    // Exclude skipped nodes:
    options.include.forEach(function (node) {
      // Sanitize field unless explicitly excluded:
      if (options.skip.indexOf(node) < 0) {
        this[node] = sanitized[node]
      }
    }, this)

    next()
  })
}
