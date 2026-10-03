import * as path from "@std/path";
import type {
  OnLoadArgs,
  OnLoadResult,
  OnResolveArgs,
  OnResolveResult,
  Plugin,
} from "esbuild";
import postcss from "postcss";
import type { AcceptedPlugin, Message } from "postcss";
import postCSSModules from "postcss-modules";

/**
 * Builds the scoped class name postcss-modules emits for a local class.
 *
 * @param name - The class name as written in the stylesheet.
 * @param filename - The absolute path of the stylesheet being processed.
 * @param css - The stylesheet's source.
 * @returns The class name to use in the generated CSS.
 */
export type GenerateScopedNameFunction = (
  name: string,
  filename: string,
  css: string,
) => string;

/**
 * Chooses the key a class is exported under in the class-name map.
 *
 * @param originalClassName - The class name as written in the stylesheet.
 * @param generatedClassName - The scoped class name postcss-modules generated.
 * @param inputFile - The absolute path of the stylesheet being processed.
 * @returns The export key for the class.
 */
export type LocalsConventionFunction = (
  originalClassName: string,
  generatedClassName: string,
  inputFile: string,
) => string;

/**
 * The class shape postcss-modules expects for its `Loader` option, which loads
 * the files named in `composes: … from "…"`.
 *
 * This class only describes that shape: it loads nothing and resolves every
 * fetch to an empty map. Set {@linkcode PostCSSModulesOptions.Loader} to a
 * class of your own with these members, not to this one.
 */
export class PostCSSModuleLoader {
  /**
   * Creates a loader for one CSS module.
   *
   * @param _root - The root directory composed paths resolve against.
   * @param _plugins - The PostCSS plugins to run on each loaded file.
   */
  constructor(_root: string, _plugins: AcceptedPlugin[]) {}

  /**
   * Loads a composed stylesheet and returns its class-name map.
   *
   * @param _file - The path named in the `composes` rule.
   * @param _relativeTo - The path of the stylesheet containing the rule.
   * @param _depTrace - A key that orders this file's CSS within `finalSource`.
   * @returns The composed file's class names keyed by original name.
   */
  fetch(
    _file: string,
    _relativeTo: string,
    _depTrace: string,
  ): Promise<{ [key: string]: string }> {
    return Promise.resolve({});
  }

  /** The CSS of every composed file loaded, prepended to the module's output. */
  finalSource?: string | undefined;
}

/**
 * Options passed through to postcss-modules for files treated as CSS modules.
 */
export interface PostCSSModulesOptions {
  /**
   * Receives each module's class-name map once it is processed. When omitted,
   * the plugin writes the map as JSON to `<stylesheet path>.json` next to the
   * source file; supplying this replaces that write.
   */
  getJSON?(
    cssFilename: string,
    json: { [name: string]: string },
    outputFilename?: string,
  ): void;
  /**
   * How class names are transformed into keys of the class-name map, such as
   * camel-casing `my-class` to `myClass`. Defaults to the names as written.
   */
  localsConvention?:
    | "camelCase"
    | "camelCaseOnly"
    | "dashes"
    | "dashesOnly"
    | LocalsConventionFunction;

  /** Whether class names are scoped by default. Defaults to `"local"`. */
  scopeBehaviour?: "global" | "local";

  /** Stylesheet paths whose class names are left unscoped. */
  globalModulePaths?: RegExp[];

  /**
   * The pattern (such as `"[name]__[local]___[hash:base64:5]"`) or function
   * that produces each scoped class name.
   */
  generateScopedName?: string | GenerateScopedNameFunction;

  /** A string mixed into the hash of generated class names. */
  hashPrefix?: string;

  /** Whether `:global` class names are also included in the class-name map. */
  exportGlobals?: boolean;

  /**
   * The root directory the `Loader` resolves composed paths against. Defaults
   * to `/`.
   */
  root?: string;

  /** The class that loads stylesheets named in `composes: … from "…"`. */
  Loader?: typeof PostCSSModuleLoader;

  /**
   * Resolves the path in `composes: … from "…"` to an absolute path, given the
   * importing stylesheet's path. A relative return value throws; return `null`
   * to fall back to the default resolution.
   */
  resolve?: (
    file: string,
    importer: string,
  ) => string | null | Promise<string | null>;
}

const moduleBindingName = /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u;
const reservedModuleBindings = new Set([
  "arguments",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

function getFilesRecursive(directory: string): string[] {
  return [...Deno.readDirSync(directory)].reduce<string[]>((files, file) => {
    const name = path.join(directory, file.name);

    return Deno.statSync(name).isDirectory
      ? [...files, ...getFilesRecursive(name)]
      : [...files, name];
  }, []);
}

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
 * What a {@linkcode Preprocessor} returns for one file.
 */
export interface PreprocessorResults {
  /** The compiled CSS, which PostCSS then processes. */
  css: string;
  /**
   * Extra files, such as imported partials, that esbuild should watch for
   * changes. The compiled file itself is always watched.
   */
  watchFiles?: string[];
}

/**
 * Compiles a stylesheet language to CSS before PostCSS runs. The Less, Sass,
 * and Stylus exports each build one; implement this to support another
 * language.
 */
export interface Preprocessor {
  /**
   * Selects the files this preprocessor compiles. It is tested against the
   * file's extension including the dot (such as `".scss"`), not its full path.
   * The plugin only resolves `.css`, `.sass`, `.scss`, `.less`, and `.styl`
   * files.
   */
  filter: RegExp;
  /**
   * Compiles one file.
   *
   * @param path - The absolute path of the file.
   * @param fileContent - The file's source.
   * @returns The compiled CSS and any extra files to watch.
   */
  compile(path: string, fileContent: string): Promise<PreprocessorResults>;
}

/**
 * Options for the postcss plugin.
 */
export interface PostCSSPluginOptions {
  /**
   * The PostCSS plugins run on every stylesheet, in order.
   *
   * To run postcss-modules yourself, set `modules` to `false`. Every file is
   * then treated as a plain stylesheet, so importing one exports only `css`
   * and no class names.
   */
  plugins?: AcceptedPlugin[];
  /**
   * Whether files matched by `isModule` are processed as CSS modules, with
   * postcss-modules run before `plugins`. Pass an object to enable them with
   * those postcss-modules options. `false` disables CSS modules entirely.
   *
   * Unless `getJSON` is supplied, each CSS module's class-name map is written
   * to `<stylesheet path>.json` next to the source file.
   *
   * @default true
   */
  modules?: boolean | PostCSSModulesOptions;
  /**
   * Decides from a file's absolute path whether it is a CSS module. Defaults to
   * files named `*.module.<ext>`, such as `button.module.css`. Ignored when
   * `modules` is `false`.
   */
  isModule?: (filename: string) => boolean;
  /**
   * Compilers for non-CSS stylesheet languages. Every preprocessor whose
   * `filter` matches runs on the original source and the last one's CSS is
   * used. A `.sass`, `.scss`, `.less`, or `.styl` file that no preprocessor
   * matches compiles to an empty stylesheet.
   */
  preprocessors?: Preprocessor[];
}

/**
 * Creates an esbuild plugin that runs `.css`, `.sass`, `.scss`, `.less`, and
 * `.styl` files through PostCSS, after any matching preprocessor.
 *
 * A stylesheet imported with a JavaScript `import` statement becomes a module
 * exporting the processed stylesheet as `css`; a CSS module also exports each
 * class name as a named export (`import { title, css } from
 * "./main.module.css"`). Export keys must be valid JavaScript binding names,
 * and `css` is reserved for the stylesheet. Use `dashesOnly` or a custom
 * `localsConvention` to remap unsupported names. There is no default export.
 * A stylesheet reached any other way, such as an entry point or a CSS
 * `@import`, is emitted as CSS.
 *
 * @example Build a stylesheet
 * ```ts
 * import esbuild from "esbuild";
 * import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";
 *
 * try {
 *   await esbuild.build({
 *     plugins: [postCSSPlugin()],
 *     entryPoints: ["./src/index.css"],
 *     outdir: "./dist",
 *     bundle: true,
 *   });
 * } finally {
 *   await esbuild.stop();
 * }
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
        const relativePath = path.relative(
          build.initialOptions.absWorkingDir ?? Deno.cwd(),
          absolutePath,
        );
        const stylesheetId = Deno.build.os === "windows"
          ? relativePath.replaceAll("\\", "/")
          : relativePath;
        const ext = path.extname(absolutePath);
        const sourceBaseName = path.basename(absolutePath, ext);
        const module = modules !== false &&
          (isModule
            ? isModule(absolutePath)
            : /\.module$/.test(sourceBaseName));

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
          path: `./${stylesheetId}`,
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
      (args: OnLoadArgs): OnLoadResult => {
        const pluginData = args.pluginData;
        const absolutePath = pluginData.absolutePath as string;
        const mod = modulesMap.get(absolutePath) ?? {};
        const css = pluginData.css;
        if (pluginData.kind === "import-statement") {
          const errors = Object.keys(mod).flatMap((key) => {
            const reason = key === "css"
              ? "conflicts with the stylesheet export"
              : !moduleBindingName.test(key) || reservedModuleBindings.has(key)
              ? "is not a valid JavaScript binding name"
              : undefined;
            return reason
              ? [{
                text: `CSS module export ${
                  JSON.stringify(key)
                } ${reason}. Rename the class or use modules.localsConvention to produce a supported name.`,
                location: { file: absolutePath },
              }]
              : [];
          });
          if (errors.length) return { errors };
        }
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
