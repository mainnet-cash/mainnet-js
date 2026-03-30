import { resolve, dirname } from "path";
import { mkdirSync, copyFileSync } from "fs";

export interface BrowserBuildOptions {
  /** Absolute path to entry file */
  entry: string;
  /** Output directory */
  outDir: string;
  /** Base filename without extension (e.g. "mainnet") */
  fileName: string;
  /** Version string from package.json */
  version: string;
  /** HTML title */
  htmlTitle?: string;
  /** Script tags / body content for generated HTML */
  htmlBody: string;
  /** Whether to minify (production mode) */
  minify: boolean;
  /** Files to copy after build */
  copyFiles?: Array<{ from: string; to: string }>;
}

function htmlPlugin(title: string, body: string) {
  return {
    name: "generate-html",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "index.html",
        source: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
${body}
  </body>
</html>
`,
      });
    },
  };
}

function copyPlugin(files: Array<{ from: string; to: string }>) {
  return {
    name: "copy-files",
    closeBundle() {
      for (const { from, to } of files) {
        mkdirSync(dirname(to), { recursive: true });
        copyFileSync(from, to);
      }
    },
  };
}

export function createBrowserBuildConfig(opts: BrowserBuildOptions) {
  const isTest = process.env.BUILD_TARGET === "test";
  const entryFileName = isTest
    ? `${opts.fileName}.js`
    : `${opts.fileName}-${opts.version}.js`;

  return {
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".wasm"],
    },
    build: {
      lib: {
        entry: opts.entry,
        formats: ["es"],
        fileName: () => entryFileName,
      },
      outDir: opts.outDir,
      emptyOutDir: false,
      minify: opts.minify,
      sourcemap: true,
      rollupOptions: {
        external: [/^@mem-cash\/validation/],
      },
    },
    plugins: [
      htmlPlugin(opts.htmlTitle ?? "The Empty Mainnet App", opts.htmlBody),
      ...(opts.copyFiles ? [copyPlugin(opts.copyFiles)] : []),
    ],
  };
}
