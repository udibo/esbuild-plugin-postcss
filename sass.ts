/**
 * The Sass preprocessor for the esbuild PostCSS Plugin.
 *
 * @module
 */
import type { Preprocessor, PreprocessorResults } from "./postcss.ts";
import * as sass from "sass";

/**
 * Creates a Sass preprocessor for the esbuild PostCSS Plugin.
 *
 * ```ts
 * import esbuild from "esbuild";
 * import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";
 * import { sassPreprocessor } from "@udibo/esbuild-plugin-postcss/sass";
 *
 * esbuild.build({
 *   plugins: [postCSSPlugin({
 *     preprocessors: [sassPreprocessor()],
 *   })],
 *   entryPoints: ["./src/index.scss"],
 *   outdir: "./dist",
 *   bundle: true,
 * });
 * ```
 *
 * @param options - The options for the sass preprocessor.
 * @returns The sass preprocessor.
 */
export function sassPreprocessor(
  options?: sass.Options<"async">,
): Preprocessor {
  return {
    filter: /\.(sass|scss)$/,
    async compile(path: string): Promise<PreprocessorResults> {
      const { css, loadedUrls } = await sass.compileAsync(path, options);
      return {
        css,
        watchFiles: loadedUrls.map((url) => url.pathname),
      };
    },
  };
}
