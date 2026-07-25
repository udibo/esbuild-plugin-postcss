/**
 * The Sass preprocessor for the esbuild PostCSS Plugin.
 *
 * `sass` is deliberately **not** a dependency of this package — you pass the
 * module in. JSR resolves a package's dependencies as one flat set across every
 * export, so a `sass` import here would be installed by every consumer,
 * including those that only ever build plain CSS.
 *
 * @module
 */

import type { Preprocessor, PreprocessorResults } from "./postcss.ts";

/**
 * The part of the `sass` module this preprocessor calls. The real module
 * satisfies it — `import * as sass from "sass"` and hand it over.
 */
export interface SassModule {
  compileAsync(
    path: string,
    options?: object,
  ): Promise<{ css: string; loadedUrls: URL[] }>;
}

/**
 * Creates a Sass preprocessor for the esbuild PostCSS Plugin.
 *
 * Add `sass` to your own dependencies and pass it in. Type `options` with
 * Sass's own option type to keep full checking.
 *
 * ```ts
 * import esbuild from "esbuild";
 * import * as sass from "sass";
 * import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";
 * import { sassPreprocessor } from "@udibo/esbuild-plugin-postcss/sass";
 *
 * esbuild.build({
 *   plugins: [postCSSPlugin({
 *     preprocessors: [sassPreprocessor(sass)],
 *   })],
 *   entryPoints: ["./src/index.scss"],
 *   outdir: "./dist",
 *   bundle: true,
 * });
 * ```
 *
 * @param sass - The `sass` module.
 * @param options - The options for the sass preprocessor.
 * @returns The sass preprocessor.
 */
export function sassPreprocessor<Options extends object = object>(
  sass: SassModule,
  options?: Options,
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
