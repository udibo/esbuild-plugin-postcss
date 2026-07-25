/**
 * The Less preprocessor for the esbuild PostCSS Plugin.
 *
 * `less` is deliberately **not** a dependency of this package — you pass the
 * module in. JSR resolves a package's dependencies as one flat set across every
 * export, so a `less` import here would be installed by every consumer,
 * including those that only ever build plain CSS.
 *
 * @module
 */

import type { Preprocessor, PreprocessorResults } from "./postcss.ts";

/**
 * The part of the `less` module this preprocessor calls. The real module
 * satisfies it — `import less from "less"` and hand it over.
 */
export interface LessModule {
  render(
    input: string,
    options: object,
  ): Promise<{ css: string }>;
}

/**
 * Creates a Less preprocessor for the esbuild PostCSS Plugin.
 *
 * Add `less` to your own dependencies and pass it in. Type `options` with
 * Less's own option type to keep full checking.
 *
 * ```ts
 * import esbuild from "esbuild";
 * import less from "less";
 * import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";
 * import { lessPreprocessor } from "@udibo/esbuild-plugin-postcss/less";
 *
 * esbuild.build({
 *   plugins: [postCSSPlugin({
 *     preprocessors: [lessPreprocessor(less)],
 *   })],
 *   entryPoints: ["./src/index.less"],
 *   outdir: "./dist",
 *   bundle: true,
 * });
 * ```
 *
 * @param less - The `less` module.
 * @param options - The options for the less preprocessor. `filename` is set per
 * file, so supplying it has no effect.
 * @returns The less preprocessor.
 */
export function lessPreprocessor<Options extends object = object>(
  less: LessModule,
  options?: Options,
): Preprocessor {
  return {
    filter: /\.less$/,
    async compile(
      path: string,
      fileContent: string,
    ): Promise<PreprocessorResults> {
      const { css } = await less.render(fileContent, {
        ...options,
        filename: path,
      });
      return { css };
    },
  };
}
