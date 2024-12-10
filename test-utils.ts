import { delay } from "@std/async/delay";
import * as path from "@std/path";
import esbuild from "esbuild";

import { postCSSPlugin } from "./postcss.ts";
import type { PostCSSPluginOptions } from "./postcss.ts";

function getSnapshotMode() {
  return Deno.args.some((arg) => arg === "--update" || arg === "-u")
    ? "update"
    : "assert";
}

/**
 * Builds the example.
 *
 * @param example - The example to build.
 * @param entryPoints - The entry points to build.
 * @param options - The options for the build.
 * @returns The build result.
 */
export async function build(
  example: string,
  entryPoints: string[],
  options: {
    pluginOptions?: PostCSSPluginOptions;
    esbuildOptions?: esbuild.BuildOptions;
  } = {},
) {
  const plugin = postCSSPlugin(options.pluginOptions);
  const buildOptions = {
    plugins: [plugin],
    entryPoints: entryPoints,
    outdir: "out",
    absWorkingDir: path.resolve(`./examples/${example}`),
    ...options.esbuildOptions,
  };
  const result = await esbuild.build({
    ...buildOptions,
    write: false,
  });
  await esbuild.stop();
  if (getSnapshotMode() === "update") {
    await esbuild.build({
      ...buildOptions,
      write: true,
    });
    await esbuild.stop();
  }
  await delay(1);
  return result;
}

/**
 * Reads a text file and normalizes the line endings to Unix style.
 *
 * @param filePath - The path to the file to read.
 * @returns The content of the file.
 */
export async function readTextFile(filePath: string) {
  return (await Deno.readTextFile(filePath)).replace(/\r\n/g, "\n");
}
