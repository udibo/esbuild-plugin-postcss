import {
  assertEquals,
  assertGreaterOrEqual,
  assertObjectMatch,
} from "@std/assert";
import * as path from "@std/path";
import { describe, it } from "@std/testing/bdd";

import { stylusPreprocessor } from "./stylus.ts";
import { build } from "./test-utils.ts";
import { postCSSPlugin } from "./postcss.ts";

describe("stylus", () => {
  const rootDir = path.resolve("./examples/stylus");

  it("stylus entrypoint should output the css", async () => {
    const result = await build(
      "stylus",
      ["./main.styl"],
      {
        plugins: [postCSSPlugin({
          preprocessors: [stylusPreprocessor()],
        })],
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
      await Deno.readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
  });

  it("ts entrypoint should output the css to js", async () => {
    const result = await build(
      "stylus",
      ["./main.ts"],
      {
        plugins: [postCSSPlugin({
          preprocessors: [stylusPreprocessor()],
        })],
        bundle: true,
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
      await Deno.readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
  });
});
