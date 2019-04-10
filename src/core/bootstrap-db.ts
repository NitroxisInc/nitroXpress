import UserModel, { Roles } from "../models/user"

export default async function() {
  if (!(await UserModel.findOne())) {
    // await UserModel.deleteMany({})
    new UserModel({
      type: Roles.admin,
      email: "admin@test.com",
      password: "12345678"
    }).save()
  }
}
