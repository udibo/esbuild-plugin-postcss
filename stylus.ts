/**
 * The Stylus preprocessor for the esbuild PostCSS Plugin.
 *
 * @module
 */

import type { Preprocessor, PreprocessorResults } from "./postcss.ts";
import stylus from "stylus";

/**
 * Creates a Stylus preprocessor for the esbuild PostCSS Plugin.
 *
 * ```ts
 * import esbuild from "esbuild";
 * import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";
 * import { stylusPreprocessor } from "@udibo/esbuild-plugin-postcss/stylus";
 *
 * esbuild.build({
 *   plugins: [postCSSPlugin({
 *     preprocessors: [stylusPreprocessor()],
 *   })],
 *   entryPoints: ["./src/index.styl"],
 *   outdir: "./dist",
 *   bundle: true,
 * });
 * ```
 *
 * @param options - The options for the stylus preprocessor.
 * @returns The stylus preprocessor.
 */
export function stylusPreprocessor(
  options?: Omit<stylus.RenderOptions, "filename">,
): Preprocessor {
  return {
    filter: /\.styl$/,
    async compile(
      path: string,
      fileContent: string,
    ): Promise<PreprocessorResults> {
      return await new Promise((resolve, reject) => {
        stylus.render(
          fileContent,
          {
            ...options,
            filename: path,
          },
          (e: Error, css: string, _js: string) => {
            if (e) reject(e);
            else resolve({ css });
          },
        );
      });
    },
  };
}
