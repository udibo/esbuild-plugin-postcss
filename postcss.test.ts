import {
  assertEquals,
  assertGreaterOrEqual,
  assertObjectMatch,
} from "@std/assert";
import * as path from "@std/path";
import { describe, it } from "@std/testing/bdd";
import { assertSnapshot } from "@std/testing/snapshot";
import type postcss from "postcss";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

import { build, readTextFile } from "./test-utils.ts";

describe("css", () => {
  describe("basic", () => {
    const rootDir = path.resolve("./examples/css");

    it("css entrypoint should output the css", async () => {
      const result = await build(
        "css",
        ["./basic.css"],
      );
      assertObjectMatch(result, {
        errors: [],
        warnings: [],
      });
      assertGreaterOrEqual(result.outputFiles.length, 1);
      const outFilePath = path.resolve(rootDir, "out/basic.css");
      assertEquals(
        result.outputFiles[0].path,
        outFilePath,
      );
      assertEquals(
        result.outputFiles[0].text,
        await readTextFile(outFilePath),
      );
      assertEquals(result.outputFiles.length, 1);
    });

    it("ts entrypoint should output the css to js", async () => {
      const result = await build(
        "css",
        ["./basic.ts"],
        {
          esbuildOptions: {
            bundle: true,
          },
        },
      );
      assertObjectMatch(result, {
        errors: [],
        warnings: [],
      });
      assertGreaterOrEqual(result.outputFiles.length, 1);
      const outFilePath = path.resolve(rootDir, "out/basic.js");
      assertEquals(
        result.outputFiles[0].path,
        outFilePath,
      );
      assertEquals(
        result.outputFiles[0].text,
        await readTextFile(outFilePath),
      );
      assertEquals(result.outputFiles.length, 1);
    });

    it("css entrypoint that bundles multiple css files", async () => {
      const result = await build(
        "css",
        ["./entry.css"],
        {
          esbuildOptions: {
            bundle: true,
          },
        },
      );
      assertObjectMatch(result, {
        errors: [],
        warnings: [],
      });
      assertGreaterOrEqual(result.outputFiles.length, 1);
      const outFilePath = path.resolve(rootDir, "out/entry.css");
      assertEquals(
        result.outputFiles[0].path,
        outFilePath,
      );
      assertEquals(
        result.outputFiles[0].text,
        await readTextFile(outFilePath),
      );
      assertEquals(result.outputFiles.length, 1);
    });
  });
});

describe("modules", () => {
  const rootDir = path.resolve("./examples/modules");

  it("modules set to false", async () => {
    const result = await build("modules", ["./disabled.css"], {
      pluginOptions: {
        modules: false,
      },
    });
    assertObjectMatch(result, {
      errors: [],
      warnings: [],
    });
    assertGreaterOrEqual(result.outputFiles.length, 1);
    const outFilePath = path.resolve(rootDir, "out/disabled.css");
    assertEquals(
      result.outputFiles[0].path,
      outFilePath,
    );
    assertEquals(
      result.outputFiles[0].text,
      await readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
  });

  it("modules defaults to true", async (t) => {
    const result = await build("modules", ["./main.module.css"], {
      pluginOptions: {
        modules: true,
      },
    });
    assertObjectMatch(result, {
      errors: [],
      warnings: [],
    });
    assertGreaterOrEqual(result.outputFiles.length, 1);
    const outFilePath = path.resolve(rootDir, "out/main.module.css");
    assertEquals(
      result.outputFiles[0].path,
      outFilePath,
    );
    assertEquals(
      result.outputFiles[0].text,
      await readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
    await assertSnapshot(
      t,
      await readTextFile(path.resolve(rootDir, "./main.module.css.json")),
    );
  });

  it("modules set to true", async (t) => {
    const result = await build("modules", ["./main.module.css"], {
      pluginOptions: {
        modules: true,
      },
    });
    assertObjectMatch(result, {
      errors: [],
      warnings: [],
    });
    assertGreaterOrEqual(result.outputFiles.length, 1);
    const outFilePath = path.resolve(rootDir, "out/main.module.css");
    assertEquals(
      result.outputFiles[0].path,
      outFilePath,
    );
    assertEquals(
      result.outputFiles[0].text,
      await readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
    await assertSnapshot(
      t,
      await readTextFile(path.resolve(rootDir, "./main.module.css.json")),
    );
  });

  it("isModule returning true", async (t) => {
    const result = await build("modules", ["./main.css"], {
      pluginOptions: {
        isModule: () => true,
      },
    });
    assertObjectMatch(result, {
      errors: [],
      warnings: [],
    });
    assertGreaterOrEqual(result.outputFiles.length, 1);
    const outFilePath = path.resolve(rootDir, "out/main.css");
    assertEquals(
      result.outputFiles[0].path,
      outFilePath,
    );
    assertEquals(
      result.outputFiles[0].text,
      await readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
    await assertSnapshot(
      t,
      await readTextFile(path.resolve(rootDir, "./main.css.json")),
    );
  });

  it("isModule returning false", async () => {
    const result = await build("modules", ["./disabled.css"], {
      pluginOptions: {
        isModule: () => false,
      },
    });
    assertObjectMatch(result, {
      errors: [],
      warnings: [],
    });
    assertGreaterOrEqual(result.outputFiles.length, 1);
    const outFilePath = path.resolve(rootDir, "out/disabled.css");
    assertEquals(
      result.outputFiles[0].path,
      outFilePath,
    );
    assertEquals(
      result.outputFiles[0].text,
      await readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
  });

  it("modules set to custom postcss-modules plugin configuration options", async (t) => {
    const result = await build("modules", ["./custom.module.css"], {
      pluginOptions: {
        modules: {
          generateScopedName: "[name]__[local]___[hash:base64:5]",
        },
      },
    });
    assertObjectMatch(result, {
      errors: [],
      warnings: [],
    });
    assertGreaterOrEqual(result.outputFiles.length, 1);
    const outFilePath = path.resolve(rootDir, "out/custom.module.css");
    assertEquals(
      result.outputFiles[0].path,
      outFilePath,
    );
    assertEquals(
      result.outputFiles[0].text,
      await readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
    await assertSnapshot(
      t,
      await readTextFile(
        path.resolve(rootDir, "./custom.module.css.json"),
      ),
    );
  });

  it("ts entrypoint should output the module map and css to js", async (t) => {
    const result = await build(
      "modules",
      ["./main.ts"],
      {
        esbuildOptions: {
          bundle: true,
        },
      },
    );
    assertObjectMatch(result, {
      errors: [],
      warnings: [],
    });
    assertGreaterOrEqual(result.outputFiles.length, 1);
    const outFilePath = path.resolve(rootDir, "out/main.js");
    assertEquals(
      result.outputFiles[0].path,
      outFilePath,
    );
    assertEquals(
      result.outputFiles[0].text,
      await readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
    await assertSnapshot(
      t,
      await readTextFile(path.resolve(rootDir, "./main.module.css.json")),
    );
  });
});

describe("plugins", () => {
  describe("autoprefixer", () => {
    const rootDir = path.resolve("./examples/autoprefixer");

    it("should add vendor prefixes to the css", async () => {
      const result = await build(
        "autoprefixer",
        ["./main.css"],
        {
          pluginOptions: {
            plugins: [
              autoprefixer(),
            ],
          },
        },
      );
      assertObjectMatch(result, {
        errors: [],
        warnings: [],
      });
      assertGreaterOrEqual(result.outputFiles.length, 1);
      const outFilePath = path.resolve(rootDir, "out/main.css");
      assertEquals(
        result.outputFiles[0].path,
        outFilePath,
      );
      assertEquals(
        result.outputFiles[0].text,
        await readTextFile(outFilePath),
      );
      assertEquals(result.outputFiles.length, 1);
    });
  });

  describe("tailwindcss", () => {
    const rootDir = path.resolve("./examples/tailwindcss");

    it("should add tailwindcss to the css", async () => {
      const result = await build("tailwindcss", ["./main.css"], {
        pluginOptions: {
          plugins: [
            tailwindcss({
              content: [
                path.resolve(rootDir, "index.html"),
              ],
            }) as postcss.Plugin,
          ],
        },
      });
      assertObjectMatch(result, {
        errors: [],
        warnings: [],
      });
      assertGreaterOrEqual(result.outputFiles.length, 1);
      const outFilePath = path.resolve(rootDir, "out/main.css");
      assertEquals(
        result.outputFiles[0].path,
        outFilePath,
      );
      assertEquals(
        result.outputFiles[0].text,
        await readTextFile(outFilePath),
      );
      assertEquals(result.outputFiles.length, 1);
    });
  });
});
