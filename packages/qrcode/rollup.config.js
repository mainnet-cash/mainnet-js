import { wasm } from "@rollup/plugin-wasm";
import typescript from "@rollup/plugin-typescript";

const conf = (fmt) => ({
  input: "src/index.ts",
  output: {
    dir: `dist/${fmt}`,
    format: fmt,
    name: "qrcode",
  },
  plugins: [
    wasm({ maxFileSize: 100000 }),
    typescript({ outDir: `dist/${fmt}` }),
  ],
});

export default [conf("cjs"), conf("es")];