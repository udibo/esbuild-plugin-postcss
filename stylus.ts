/**
 * The Stylus preprocessor for the esbuild PostCSS Plugin.
 *
 * `stylus` is deliberately **not** a dependency of this package — you pass the
 * module in. JSR resolves a package's dependencies as one flat set across every
 * export, so a `stylus` import here would be installed by every consumer,
 * including those that only ever build plain CSS.
 *
 * @module
 */

import type { Preprocessor, PreprocessorResults } from "./postcss.ts";

/**
 * The part of the `stylus` module this preprocessor calls. The real module
 * satisfies it — `import stylus from "stylus"` and hand it over.
 */
export interface StylusModule {
  render(
    input: string,
    options: object,
    callback: (error: Error, css: string, js: string) => void,
  ): void;
}

/**
 * Creates a Stylus preprocessor for the esbuild PostCSS Plugin.
 *
 * Add `stylus` to your own dependencies and pass it in. Type `options` with
 * Stylus's own option type to keep full checking.
 *
 * ```ts
 * import esbuild from "esbuild";
 * import stylus from "stylus";
 * import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";
 * import { stylusPreprocessor } from "@udibo/esbuild-plugin-postcss/stylus";
 *
 * esbuild.build({
 *   plugins: [postCSSPlugin({
 *     preprocessors: [stylusPreprocessor(stylus)],
 *   })],
 *   entryPoints: ["./src/index.styl"],
 *   outdir: "./dist",
 *   bundle: true,
 * });
 * ```
 *
 * @param stylus - The `stylus` module.
 * @param options - The options for the stylus preprocessor. `filename` is set
 * per file, so supplying it has no effect.
 * @returns The stylus preprocessor.
 */
export function stylusPreprocessor<Options extends object = object>(
  stylus: StylusModule,
  options?: Options,
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
