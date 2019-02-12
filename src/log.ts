// tslint:disable:no-console
import chalk from "chalk"
import * as _ from "lodash"

const stringify = (args) => {
  return _.map(args, arg => {
    if (_.isObject(arg)) {
      return require("util").inspect(arg, {showHidden: true})
    }
    return arg
  }).join("\n")
}

export default {
  error: (...args): void => {
    // let g = stringify(args)
    console.log(chalk.bgRed.white(
      // require('util').inspect(stringify(args))
      stringify(args)
    ))
  },
  info: (...args): void => {
    console.log(chalk.bgBlue.white(
      stringify(args)
    ))
  },
  warn: (...args): void => {
    console.log(chalk.bgYellow.white(
        stringify(args)
      // require('util').inspect()
    ))
  },
  debug: (...args): void => {
    console.log(chalk.bgBlack.white(
        stringify(args)
      // require('util').inspect(stringify(args))
    ))
  }
} as ILog
