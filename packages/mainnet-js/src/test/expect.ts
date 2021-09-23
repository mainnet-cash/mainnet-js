export { delay } from "../util/delay";

export function expect(expected) {
  return {
    toBe: function (received) {
      if (!(expected === received)) {
        throw new Error(
          `assertion failed: expected ${expected} is not equal to received ${received}`
        );
      }
    },
    toBeGreaterThan: function (received) {
      if (!(expected > received)) {
        throw new Error(
          `assertion failed: expected ${expected} is not GreaterThan received ${received}`
        );
      }
    },
    toBeGreaterThanOrEqual: function (received) {
      if (!(expected >= received)) {
        throw new Error(
          `assertion failed: expected ${expected} is not GreaterThanOrEqual received ${received}`
        );
      }
    },
    toStrictEqual: function (received) {
      if (!(JSON.stringify(expected) === JSON.stringify(received))) {
        throw new Error(
          `assertion failed: expected ${expected} is not StrictEqual to received ${received}`
        );
      }
    },
  };
}
