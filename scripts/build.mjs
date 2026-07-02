import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await build({
  entryPoints: {
    background: "src/background/index.ts",
    content: "src/content/index.ts",
    options: "src/options/index.ts",
    "page-bridge": "src/content/page-bridge.ts"
  },
  outdir: "dist",
  bundle: true,
  format: "esm",
  target: "chrome116",
  sourcemap: true,
  minify: true,
  legalComments: "none"
});
await cp("public/manifest.json", "dist/manifest.json");
await cp("public/options.html", "dist/options.html");
console.log("Built OpenLeet into dist/");
