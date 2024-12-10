import type { Preprocessor, PreprocessorResults } from "./postcss.ts";
import less from "less";

/**
 * Creates a Less preprocessor for the esbuild PostCSS Plugin.
 *
 * ```ts
 * import esbuild from "esbuild";
 * import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";
 * import { lessPreprocessor } from "@udibo/esbuild-plugin-postcss/less";
 *
 * esbuild.build({
 *   plugins: [postCSSPlugin({
 *     preprocessors: [lessPreprocessor()],
 *   })],
 *   entryPoints: ["./src/index.less"],
 *   outdir: "./dist",
 *   bundle: true,
 * });
 * ```
 *
 * @param options - The options for the less preprocessor.
 * @returns The less preprocessor.
 */
export function lessPreprocessor(
  options?: Omit<less.Options, "filename">,
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
