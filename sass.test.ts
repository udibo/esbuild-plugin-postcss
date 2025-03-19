import {
  assertEquals,
  assertGreaterOrEqual,
  assertObjectMatch,
} from "@std/assert";
import * as path from "@std/path";
import { describe, it } from "@std/testing/bdd";

import { sassPreprocessor } from "./sass.ts";
import { build } from "./test-utils.ts";
import { postCSSPlugin } from "./postcss.ts";

describe("sass", () => {
  const rootDir = path.resolve("./examples/sass");

  describe(".scss file extension", () => {
    it("scss entrypoint should output the css", async () => {
      const result = await build(
        "sass",
        ["./a.scss"],
        {
          plugins: [postCSSPlugin({
            preprocessors: [sassPreprocessor()],
          })],
        },
      );
      assertObjectMatch(result, {
        errors: [],
        warnings: [],
      });
      assertGreaterOrEqual(result.outputFiles.length, 1);
      const outFilePath = path.resolve(rootDir, "out/a.css");
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
        "sass",
        ["./a.ts"],
        {
          plugins: [postCSSPlugin({
            preprocessors: [sassPreprocessor()],
          })],
          bundle: true,
        },
      );
      assertObjectMatch(result, {
        errors: [],
        warnings: [],
      });
      assertGreaterOrEqual(result.outputFiles.length, 1);
      const outFilePath = path.resolve(rootDir, "out/a.js");
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

  describe(".sass file extension", () => {
    it("sass entrypoint should output the css", async () => {
      const result = await build(
        "sass",
        ["./b.sass"],
        {
          plugins: [postCSSPlugin({
            preprocessors: [sassPreprocessor()],
          })],
        },
      );
      assertObjectMatch(result, {
        errors: [],
        warnings: [],
      });
      assertGreaterOrEqual(result.outputFiles.length, 1);
      const outFilePath = path.resolve(rootDir, "out/b.css");
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
        "sass",
        ["./b.ts"],
        {
          plugins: [postCSSPlugin({
            preprocessors: [sassPreprocessor()],
          })],
          bundle: true,
        },
      );
      assertObjectMatch(result, {
        errors: [],
        warnings: [],
      });
      assertGreaterOrEqual(result.outputFiles.length, 1);
      const outFilePath = path.resolve(rootDir, "out/b.js");
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
