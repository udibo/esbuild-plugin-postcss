import { delay } from "@std/async/delay";
import * as path from "@std/path";
import esbuild from "esbuild";

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
  options: esbuild.BuildOptions,
) {
  const buildOptions = {
    entryPoints: entryPoints,
    outdir: "out",
    absWorkingDir: path.resolve(`./examples/${example}`),
    format: "esm",
    ...options,
  } as esbuild.BuildOptions;
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
