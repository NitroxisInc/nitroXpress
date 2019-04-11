import chalk from "chalk"
import * as _ from "lodash"

const stringify = (args: any[]) => {
  return _.map(args, (arg) => {
    if (_.isObject(arg)) {
      return require("util").inspect(arg, {showHidden: true})
    }
    return arg
  }).join("\n")
}

export default {
  error: (...args: any): void => {
    console.log(chalk.bgRed.white(
      stringify(args)
    ))
  },
  info: (...args: any): void => {
    console.log(chalk.bgBlue.white(
      stringify(args)
    ))
  },
  warn: (...args: any): void => {
    console.log(chalk.bgYellow.white(
      stringify(args)
      // require('util').inspect()
    ))
  },
  debug: (...args: any): void => {
    console.log(chalk.bgBlack.white(
      stringify(args)
      // require('util').inspect(stringify(args))
    ))
  }
}
