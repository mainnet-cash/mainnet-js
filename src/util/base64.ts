export function btoa(data: string) {
  if (typeof process === "undefined") {
    return globalThis.btoa(data);
  } else {
    const btoa = (str: string) => {
      return Buffer.from(str).toString("base64");
    };
    return btoa(data);
  }
}

export function atob(data: string) {
  if (typeof process === "undefined") {
    return globalThis.atob(data);
  } else {
    const atob = (str: string) => {
      return Buffer.from(str, "base64").toString("binary");
    };
    return atob(data);
  }
}
