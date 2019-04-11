/* eslint-disable */
declare namespace NodeJS {
  export interface Global {
    log: ILog
  }
}

interface ILog {
  error(...any): void,
  warn(...any): void,
  debug(...any): void,
  info(...any): void
}
declare var log: ILog
