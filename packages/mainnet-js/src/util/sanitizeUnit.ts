import { UnitEnum } from "../enum.js";

export function sanitizeUnit(rawUnit: any): UnitEnum {
  if (rawUnit) {
    return rawUnit.toLocaleLowerCase() as UnitEnum;
  } else {
    throw Error(
      "Attempted to sanitize a unit of value, but the unit was undefined."
    );
  }
}
