import { isArrayLike, isEmpty } from "lodash"
export const asyncForEach = async (array, callback) => {
  if (isArrayLike(array) && !isEmpty(array)) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array)
    }
  }
}
