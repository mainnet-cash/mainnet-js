export function expect(expected) {
  return {
    toBe: function (received) {
      if (!(expected === received)) {
        throw new Error(
          `assertion failed: expected ${expected} is not equal to received ${received}`
        );
      }
    },
    toEqual: function (received) {
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
    toContain: function (received) {
      if (!(expected as String).includes(received)) {
        throw new Error(
          `assertion failed: expected ${expected} does not Contain received ${received}`
        );
      }
    },
    rejects: {
      toThrow: async function (message: string): Promise<void> {
        try {
          await expected;
        } catch (e: any) {
          if (!(e.message as String).includes(message)) {
            throw new Error(
              `assertion failed: expected function to throw with message ${message}, but it did not.`
            );
          }
        }
      },
    },
  };
}
