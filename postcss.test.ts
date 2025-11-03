import {
  assertEquals,
  assertGreaterOrEqual,
  assertObjectMatch,
} from "@std/assert";
import * as path from "@std/path";
import { describe, it } from "@std/testing/bdd";
import { assertSnapshot } from "@std/testing/snapshot";
import { denoPlugin } from "@deno/esbuild-plugin";
import type postcss from "postcss";
import autoprefixer from "autoprefixer";
import tailwindcss3 from "tailwindcss3";
import tailwindcss from "@tailwindcss/postcss";

import { build } from "./test-utils.ts";
import { postCSSPlugin } from "./postcss.ts";

describe("css", () => {
  describe("basic", () => {
    const rootDir = path.resolve("./examples/css");

    it("css entrypoint should output the css", async () => {
      const result = await build(
        "css",
        ["./basic.css"],
        { plugins: [postCSSPlugin()] },
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
        await Deno.readTextFile(outFilePath),
      );
      assertEquals(result.outputFiles.length, 1);
    });

    it("ts entrypoint should output the css to js", async () => {
      const result = await build(
        "css",
        ["./basic.ts"],
        {
          plugins: [postCSSPlugin()],
          bundle: true,
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
        await Deno.readTextFile(outFilePath),
      );
      assertEquals(result.outputFiles.length, 1);
    });

    it("css entrypoint that bundles multiple css files", async () => {
      const result = await build(
        "css",
        ["./entry.css"],
        {
          plugins: [postCSSPlugin()],
          bundle: true,
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
        await Deno.readTextFile(outFilePath),
      );
      assertEquals(result.outputFiles.length, 1);
    });
  });
});

describe("modules", () => {
  const rootDir = path.resolve("./examples/modules");

  it("modules set to false", async () => {
    const result = await build("modules", ["./disabled.css"], {
      plugins: [postCSSPlugin({ modules: false })],
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
      await Deno.readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
  });

  it("modules defaults to true", async (t) => {
    const result = await build("modules", ["./main.module.css"], {
      plugins: [postCSSPlugin({ modules: true })],
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
      await Deno.readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
    await assertSnapshot(
      t,
      await Deno.readTextFile(path.resolve(rootDir, "./main.module.css.json")),
    );
  });

  it("modules set to true", async (t) => {
    const result = await build("modules", ["./main.module.css"], {
      plugins: [postCSSPlugin({ modules: true })],
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
      await Deno.readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
    await assertSnapshot(
      t,
      await Deno.readTextFile(path.resolve(rootDir, "./main.module.css.json")),
    );
  });

  it("isModule returning true", async (t) => {
    const result = await build("modules", ["./main.css"], {
      plugins: [postCSSPlugin({ isModule: () => true })],
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
      await Deno.readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
    await assertSnapshot(
      t,
      await Deno.readTextFile(path.resolve(rootDir, "./main.css.json")),
    );
  });

  it("isModule returning false", async () => {
    const result = await build("modules", ["./disabled.css"], {
      plugins: [postCSSPlugin({ isModule: () => false })],
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
      await Deno.readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
  });

  it("modules set to custom postcss-modules plugin configuration options", async (t) => {
    const result = await build("modules", ["./custom.module.css"], {
      plugins: [postCSSPlugin({
        modules: {
          generateScopedName: "[name]__[local]___[hash:base64:5]",
        },
      })],
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
      await Deno.readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
    await assertSnapshot(
      t,
      await Deno.readTextFile(
        path.resolve(rootDir, "./custom.module.css.json"),
      ),
    );
  });

  it("ts entrypoint should output the module map and css to js", async (t) => {
    const result = await build(
      "modules",
      ["./main.ts"],
      { bundle: true, plugins: [postCSSPlugin()] },
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
      await Deno.readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
    await assertSnapshot(
      t,
      await Deno.readTextFile(path.resolve(rootDir, "./main.module.css.json")),
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
        { plugins: [postCSSPlugin({ plugins: [autoprefixer()] })] },
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
        await Deno.readTextFile(outFilePath),
      );
      assertEquals(result.outputFiles.length, 1);
    });
  });

  describe("tailwindcss 3", () => {
    const rootDir = path.resolve("./examples/tailwindcss3");

    it("should add tailwindcss to the css", async () => {
      const result = await build("tailwindcss3", ["./main.css"], {
        plugins: [postCSSPlugin({
          plugins: [
            tailwindcss3({
              content: [
                path.resolve(rootDir, "index.html"),
              ],
            }) as postcss.Plugin,
          ],
        })],
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
        await Deno.readTextFile(outFilePath),
      );
      assertEquals(result.outputFiles.length, 1);
    });
  });

  describe("tailwindcss 4", () => {
    const rootDir = path.resolve("./examples/tailwindcss4");
    const configPath = path.resolve(Deno.cwd(), "deno.json");

    it("should add tailwindcss to the css", async () => {
      const result = await build("tailwindcss4", ["./main.css"], {
        plugins: [
          denoPlugin({ configPath, debug: true }),
          postCSSPlugin({
            plugins: [
              tailwindcss(),
            ],
          }),
        ],
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
        await Deno.readTextFile(outFilePath),
      );
      assertEquals(result.outputFiles.length, 1);
    });
  });
});
