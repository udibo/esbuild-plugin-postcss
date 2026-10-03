import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { delay } from "@std/async/delay";
import * as path from "@std/path";
import { describe, it } from "@std/testing/bdd";
import esbuild from "esbuild";

import { postCSSPlugin, type PostCSSPluginOptions } from "./postcss.ts";

async function withStylesheet(
  css: string,
  options: PostCSSPluginOptions,
  verify: (
    result: esbuild.BuildResult,
    directory: string,
  ) => Promise<void> | void,
  stylesheetEntry = false,
) {
  const directory = await Deno.makeTempDir({ prefix: "postcss-export-names-" });
  const stylesheet = path.join(directory, "styles.module.css");
  try {
    await Deno.writeTextFile(stylesheet, css);
    const result = await esbuild.build({
      absWorkingDir: directory,
      ...(stylesheetEntry ? { entryPoints: [stylesheet] } : {
        stdin: {
          contents:
            'import * as styles from "./styles.module.css"; export { styles };',
          resolveDir: directory,
          sourcefile: "entry.js",
        },
      }),
      plugins: [postCSSPlugin(options)],
      bundle: true,
      format: "esm",
      outfile: path.join(directory, stylesheetEntry ? "out.css" : "out.js"),
      write: false,
      logLevel: "silent",
    });
    await verify(result, directory);
  } finally {
    await esbuild.stop();
    await delay(1);
    await Deno.remove(directory, { recursive: true });
  }
}

async function importStyles(result: esbuild.BuildResult, directory: string) {
  const output = path.join(directory, "result.mjs");
  await Deno.writeTextFile(output, result.outputFiles![0].text);
  const module = await import(path.toFileUrl(output).href);
  return module.styles as Record<string, string>;
}

describe("CSS module JavaScript export names", () => {
  for (
    const key of [
      "foo-bar",
      "default",
      "class",
      "await",
      "yield",
      "let",
      "enum",
      "implements",
      "interface",
      "package",
      "private",
      "protected",
      "public",
      "static",
      "eval",
      "arguments",
      "123name",
      "",
    ]
  ) {
    it(`reports the transformed invalid binding ${JSON.stringify(key)}`, async () => {
      const error = await assertRejects(
        () =>
          withStylesheet(".original { color: red; }", {
            modules: { localsConvention: () => key, getJSON() {} },
          }, () => {}),
        Error,
        `CSS module export ${
          JSON.stringify(key)
        } is not a valid JavaScript binding name`,
      ) as esbuild.BuildFailure;
      assertEquals(error.errors.length, 1);
      assertEquals(error.errors[0].pluginName, "postcss");
      assertStringIncludes(error.errors[0].location!.file, "styles.module.css");
      assertStringIncludes(error.errors[0].text, "modules.localsConvention");
    });
  }

  it("reports every unsupported original class key in the stylesheet", async () => {
    const error = await assertRejects(
      () =>
        withStylesheet(".foo-bar { color: red; } .default { color: blue; }", {
          modules: { getJSON() {} },
        }, () => {}),
      Error,
      'CSS module export "foo-bar" is not a valid JavaScript binding name',
    ) as esbuild.BuildFailure;
    assertEquals(error.errors.length, 2);
    assertStringIncludes(
      error.errors.map((entry) => entry.text).join("\n"),
      'CSS module export "default"',
    );
    assertEquals(error.errors.map((entry) => entry.pluginName), [
      "postcss",
      "postcss",
    ]);
  });

  it("preserves valid identifier joiners supplied by a custom convention", async () => {
    const key = "a\u200Cb\u200Dc";
    await withStylesheet(".title { color: red; }", {
      modules: {
        localsConvention: () => key,
        generateScopedName: "scoped_[local]",
        getJSON() {},
      },
    }, async (result, directory) => {
      const styles = await importStyles(result, directory);
      assertEquals(styles[key], "scoped_title");
      assertEquals(Object.keys(styles).sort(), [key, "css"]);
      assertStringIncludes(styles.css, ".scoped_title");
    });
  });
  it("reports a class that conflicts with the stylesheet payload", async () => {
    const error = await assertRejects(
      () =>
        withStylesheet(".css { color: red; }", {
          modules: { getJSON() {} },
        }, () => {}),
      Error,
      'CSS module export "css" conflicts with the stylesheet export',
    ) as esbuild.BuildFailure;
    assertEquals(error.errors.length, 1);
    assertEquals(error.errors[0].pluginName, "postcss");
    assertStringIncludes(error.errors[0].text, "modules.localsConvention");
  });

  it("preserves valid Unicode and contextual names and their class values", async () => {
    const names = [
      "title",
      "café",
      "δ",
      "á",
      "async",
      "as",
      "from",
      "of",
      "get",
      "set",
    ];
    const classes: Record<string, string> = {};
    await withStylesheet(
      names.map((name) => `.${name} { color: red; }`).join("\n"),
      {
        modules: {
          generateScopedName: (name) => `scoped_${name}`,
          getJSON(_filename, json) {
            Object.assign(classes, json);
          },
        },
      },
      async (result, directory) => {
        const styles = await importStyles(result, directory);
        const { css, ...exports } = styles;
        assertEquals(exports, classes);
        assertEquals(Object.keys(exports).sort(), names.sort());
        for (const name of names) {
          assertEquals(exports[name], `scoped_${name}`);
          assertStringIncludes(css, `.scoped_${name}`);
        }
      },
    );
  });

  it("uses dashesOnly to export a dashed class under a supported name", async () => {
    await withStylesheet(".foo-bar { color: red; }", {
      modules: {
        localsConvention: "dashesOnly",
        generateScopedName: "scoped_[local]",
        getJSON() {},
      },
    }, async (result, directory) => {
      const styles = await importStyles(result, directory);
      assertEquals(styles.fooBar, "scoped_foo-bar");
      assertEquals(Object.keys(styles).sort(), ["css", "fooBar"]);
      assertStringIncludes(styles.css, ".scoped_foo-bar");
    });
  });

  it("lets a custom convention remap a reserved class name", async () => {
    await withStylesheet(".default { color: red; } .css { color: blue; }", {
      modules: {
        localsConvention: (name) => `${name}Class`,
        generateScopedName: "scoped_[local]",
        getJSON() {},
      },
    }, async (result, directory) => {
      const styles = await importStyles(result, directory);
      assertEquals(styles.defaultClass, "scoped_default");
      assertEquals(styles.cssClass, "scoped_css");
      assertStringIncludes(styles.css, ".scoped_default");
    });
  });

  it("keeps arbitrary class-map keys for stylesheet entry points", async () => {
    await withStylesheet(
      ".foo-bar { color: red; } .default { color: blue; } .css { color: green; }",
      {},
      async (result, directory) => {
        const classes = JSON.parse(
          await Deno.readTextFile(
            path.join(directory, "styles.module.css.json"),
          ),
        );
        assertEquals(Object.keys(classes).sort(), [
          "css",
          "default",
          "foo-bar",
        ]);
        assertStringIncludes(result.outputFiles![0].text, classes["foo-bar"]);
        assertStringIncludes(result.outputFiles![0].text, classes.default);
        assertStringIncludes(result.outputFiles![0].text, classes.css);
      },
      true,
    );
  });

  it("keeps modules disabled and exports only the stylesheet", async () => {
    await withStylesheet(
      ".foo-bar { color: red; } .default { color: blue; } .css { color: green; }",
      {
        modules: false,
      },
      async (result, directory) => {
        const styles = await importStyles(result, directory);
        assertEquals(Object.keys(styles), ["css"]);
        assertStringIncludes(styles.css, ".foo-bar");
        assertStringIncludes(styles.css, ".default");
        assertStringIncludes(styles.css, ".css");
      },
    );
  });
});
