import {
  assertEquals,
  assertGreaterOrEqual,
  assertObjectMatch,
} from "@std/assert";
import * as path from "@std/path";
import { describe, it } from "@std/testing/bdd";

import { lessPreprocessor } from "./less.ts";
import { build } from "./test-utils.ts";

describe("less", () => {
  const rootDir = path.resolve("./examples/less");

  it("less entrypoint should output the css", async () => {
    const result = await build(
      "less",
      ["./main.less"],
      {
        pluginOptions: {
          preprocessors: [lessPreprocessor()],
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
      await Deno.readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
  });

  it("ts entrypoint should output the css to js", async () => {
    const result = await build(
      "less",
      ["./main.ts"],
      {
        pluginOptions: {
          preprocessors: [lessPreprocessor()],
        },
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
      await Deno.readTextFile(outFilePath),
    );
    assertEquals(result.outputFiles.length, 1);
  });
});
