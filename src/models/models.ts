import { Model } from "mongoose"
import UserModel from "./user"
import PlatformModel from "./platform"

export interface IModels {
  UserModel: Model<any>
  PlatformModel: Model<any>
}

export const Models = {
  UserModel,
  PlatformModel
} as IModels

export default Models
