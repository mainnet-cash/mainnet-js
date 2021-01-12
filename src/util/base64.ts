import { getRuntimePlatform } from "./getRuntimePlatform";

export function btoa(data: string) {
  if (getRuntimePlatform() !== "node") {
    return globalThis.btoa(data);
  } else {
    const btoa = (str: string) => {
      return Buffer.from(str).toString("base64");
    };
    return btoa(data);
  }
}

export function atob(data: string) {
  if (getRuntimePlatform() !== "node") {
    return globalThis.atob(data);
  } else {
    const atob = (str: string) => {
      return Buffer.from(str, "base64").toString("binary");
    };
    return atob(data);
  }
}
