import * as path from "@std/path";
import type {
  OnLoadArgs,
  OnLoadResult,
  OnResolveArgs,
  OnResolveResult,
  Plugin,
} from "esbuild";
import postcss from "postcss";
import type { Message, Plugin as PostCSSPlugin } from "postcss";
import postCSSModules from "postcss-modules";

/**
 * Generate a scoped name for a class.
 *
 * @param name - The name of the class.
 * @param filename - The filename of the file.
 * @param css - The css of the file.
 * @returns The scoped name.
 */
export type GenerateScopedNameFunction = (
  name: string,
  filename: string,
  css: string,
) => string;

/**
 * Locals convention function.
 *
 * @param originalClassName - The original class name.
 * @param generatedClassName - The generated class name.
 * @param inputFile - The input file.
 * @returns The scoped name.
 */
export type LocalsConventionFunction = (
  originalClassName: string,
  generatedClassName: string,
  inputFile: string,
) => string;

/**
 * A loader for postcss modules.
 */
export class PostCSSModuleLoader {
  constructor(_root: string, _plugins: PostCSSPlugin[]) {}

  /**
   * Fetch the class names from the file.
   *
   * @param file - The file.
   * @param relativeTo - The relative to.
   * @param depTrace - The dependency trace.
   * @returns The class names.
   */
  fetch(
    _file: string,
    _relativeTo: string,
    _depTrace: string,
  ): Promise<{ [key: string]: string }> {
    return Promise.resolve({});
  }

  /** The final source. */
  finalSource?: string | undefined;
}

/**
 * Options for postcss modules.
 */
export interface PostCSSModulesOptions {
  /** Get the json from the file. */
  getJSON?(
    cssFilename: string,
    json: { [name: string]: string },
    outputFilename?: string,
  ): void;
  /** Style of exported class names. */
  localsConvention?:
    | "camelCase"
    | "camelCaseOnly"
    | "dashes"
    | "dashesOnly"
    | LocalsConventionFunction;

  /** Behavior of the scope. by default it is local. */
  scopeBehaviour?: "global" | "local";

  /** Paths to modules that should be treated as global. */
  globalModulePaths?: RegExp[];

  /** Style of exported class names. */
  generateScopedName?: string | GenerateScopedNameFunction;

  /** Prefix for the hash. */
  hashPrefix?: string;

  /** Whether to export globals. */
  exportGlobals?: boolean;

  /** The root of the module. */
  root?: string;

  /** The loader for the postcss modules. */
  Loader?: typeof PostCSSModuleLoader;

  /** Resolve the file. */
  resolve?: (
    file: string,
    importer: string,
  ) => string | null | Promise<string | null>;
}

/**
 * Get the files recursively from the directory.
 *
 * @returns an array of strings
 */
function getFilesRecursive(directory: string): string[] {
  return [...Deno.readDirSync(directory)].reduce<string[]>((files, file) => {
    const name = path.join(directory, file.name);

    return Deno.statSync(name).isDirectory
      ? [...files, ...getFilesRecursive(name)]
      : [...files, name];
  }, []);
}

/**
 * Get the dependencies from the postcss messages.
 *
 * @returns an array of strings
 */
function getPostCSSDependencies(messages: Message[]): string[] {
  const dependencies: string[] = [];
  for (const message of messages) {
    if (message.type == "dir-dependency") {
      dependencies.push(...getFilesRecursive(message.dir));
    } else if (message.type == "dependency") {
      dependencies.push(message.file);
    }
  }
  return dependencies;
}

/**
 * The results of a preprocessor.
 */
export interface PreprocessorResults {
  css: string;
  watchFiles?: string[];
}

/**
 * A preprocessor for the PostCSS Plugin to use.
 */
export interface Preprocessor {
  /** The path filter for the preprocessor. */
  filter: RegExp;
  /** Compile the file with the preprocessor. */
  compile(path: string, fileContent: string): Promise<PreprocessorResults>;
}

/**
 * Options for the postcss plugin.
 */
export interface PostCSSPluginOptions {
  /**
   * Array of plugins for postcss.
   * If you include the postcss-module plugin in that list, set modules to false
   * so that it is used instead of the default postcss-module.
   */
  plugins?: PostCSSPlugin[];
  /**
   * Configure whether or not the postcss-modules is added to the beginning of the list of plugins.
   * If this is an object, it will be used as the postcss-module's plugin options.
   *
   * @default true
   */
  modules?: boolean | PostCSSModulesOptions;
  /**
   * Determines if the file should be considered a postcss module.
   * By default, only files with .module in their extension are considered postcss module.
   */
  isModule?: (filename: string) => boolean;
  preprocessors?: Preprocessor[];
}

/**
 * The postcss plugin for esbuild.
 *
 * ```ts
 * import esbuild from "esbuild";
 * import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";
 *
 * esbuild.build({
 *   plugins: [postCSSPlugin()],
 *   entryPoints: ["./src/index.css"],
 *   outdir: "./dist",
 *   bundle: true,
 * });
 * ```
 *
 * @param options - The options for the postcss plugin.
 * @returns The postcss plugin.
 */
export const postCSSPlugin = (
  options: PostCSSPluginOptions = {},
): Plugin => ({
  name: "postcss",
  setup(build) {
    const plugins = options.plugins ?? [];
    const preprocessors = options.preprocessors ?? [];
    const modules = options.modules ?? true;
    const {
      isModule,
    } = options;

    const modulesMap: Map<string, Record<string, string>> = new Map();
    const modulesPlugin = postCSSModules({
      ...(typeof modules !== "boolean" && modules ? modules : {}),
      async getJSON(filepath, json, outpath) {
        modulesMap.set(filepath, json);

        if (
          typeof modules !== "boolean" &&
          typeof modules?.getJSON === "function"
        ) {
          return modules.getJSON(filepath, json, outpath);
        } else {
          await Deno.writeTextFile(`${filepath}.json`, JSON.stringify(json));
        }
      },
    });

    build.onResolve(
      { filter: /\.(css|sass|scss|less|styl)$/ },
      /**
       * Handles resolving the path of a .css, .sass, .scss, .less, or .styl file.
       * For non .css files, the file is preprocessed with the appropriate preprocessor.
       * Then the postcss plugin is applied to the file.
       *
       * @param args - The arguments for the onResolve event.
       * @returns The resolved path or null if the file is not a css file.
       */
      async (
        args: OnResolveArgs,
      ): Promise<OnResolveResult | null | undefined> => {
        if (
          args.namespace !== "file" && args.namespace !== "" &&
          !args.namespace.startsWith("postcss-module")
        ) {
          return null;
        }

        const absolutePath = path.resolve(args.resolveDir, args.path);
        const ext = path.extname(absolutePath);
        const sourceBaseName = path.basename(absolutePath, ext);
        const module = isModule
          ? isModule(absolutePath)
          : sourceBaseName.match(/\.module$/);

        const fileContent = await Deno.readTextFile(absolutePath);
        let css = ext === ".css" ? fileContent : "";
        let watchFiles: string[] = [];

        for (const preprocessor of preprocessors) {
          if (preprocessor.filter.test(ext)) {
            const results = await preprocessor.compile(
              absolutePath,
              fileContent,
            );
            css = results.css;
            if (results.watchFiles) {
              watchFiles = watchFiles.concat(results.watchFiles);
            }
          }
        }

        const result = await postcss(
          module ? [modulesPlugin, ...plugins] : plugins,
        ).process(css, {
          from: absolutePath,
        });

        if (result.opts.from) watchFiles.push(result.opts.from);
        watchFiles = watchFiles.concat(getPostCSSDependencies(result.messages));

        return {
          namespace: module ? "postcss-module" : "postcss",
          path: args.path,
          watchFiles,
          pluginData: {
            resolveDir: args.resolveDir,
            absolutePath,
            kind: args.kind,
            css: result.css,
          },
        };
      },
    );

    build.onLoad(
      { filter: /.*/, namespace: "postcss-module" },
      /**
       * Handles loading of CSS modules, which contain both styles and class name mappings.
       *
       * For import statements (e.g., `import styles from './styles.module.css'`):
       * - Returns a JS module that exports:
       *   - Individual class name mappings (e.g., `export const button = "button_hash"`)
       *   - The processed CSS as a string (`export const css = "..."`)
       *
       * For direct inclusion as an esbuild entrypoint:
       * - Returns the processed CSS directly
       *
       * @param args - Contains pluginData with resolveDir, absolutePath, kind, and processed css
       * @returns OnLoadResult with either JS module exports or raw CSS
       */
      (args: OnLoadArgs): OnLoadResult => {
        const pluginData = args.pluginData;
        const absolutePath = pluginData.absolutePath as string;
        const mod = modulesMap.get(absolutePath) ?? {};
        const css = pluginData.css;
        return {
          resolveDir: pluginData.resolveDir,
          loader: pluginData.kind === "import-statement" ? "js" : "css",
          contents: pluginData.kind === "import-statement"
            ? [
              ...Object.entries(mod).map(([key, value]) =>
                `export const ${key} = ${JSON.stringify(value)};`
              ),
              `export const css = ${JSON.stringify(css)};`,
            ].join("\n")
            : css,
        };
      },
    );

    build.onLoad(
      { filter: /.*/, namespace: "postcss" },
      /**
       * Handles loading of regular CSS files (non-modules).
       *
       * For import statements (e.g., `import './styles.css'`):
       * - Returns a JS module that exports:
       *   - The processed CSS as a string (`export const css = "..."`)
       *
       * For direct inclusion as an esbuild entrypoint:
       * - Returns the processed CSS directly
       *
       * @param args - Contains pluginData with resolveDir, kind, and processed css
       * @returns OnLoadResult with either JS module exports or raw CSS
       */
      (args: OnLoadArgs): OnLoadResult => {
        const pluginData = args.pluginData;
        return {
          resolveDir: pluginData.resolveDir,
          loader: pluginData.kind === "import-statement" ? "js" : "css",
          contents: pluginData.kind === "import-statement"
            ? `export const css = ${JSON.stringify(pluginData.css)};`
            : pluginData.css,
        };
      },
    );
  },
});
