export const json = (param: any) => {
  return JSON.stringify(
    param,
    (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
  );
};
export default json;

describe("json tests", () => {
  test("Should serialize bigint", async () => {
    expect(json(1n)).toBe('"1"');
  });
});
