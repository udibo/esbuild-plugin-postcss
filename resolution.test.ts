import {
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import * as path from "@std/path";
import { describe, it } from "@std/testing/bdd";

import { postCSSPlugin } from "./postcss.ts";
import { build } from "./test-utils.ts";

describe("stylesheet identity and module selection", () => {
  for (const filename of ["styles.css", "styles.module.css"]) {
    it(`keeps both ${filename} imports when they belong to different directories`, async () => {
      const root = await Deno.makeTempDir({ prefix: "postcss identity " });
      try {
        for (
          const [directory, color] of [["first", "red"], ["second", "blue"]]
        ) {
          await Deno.mkdir(path.join(root, directory));
          await Deno.writeTextFile(
            path.join(root, directory, filename),
            `.box { color: ${color}; }`,
          );
          await Deno.writeTextFile(
            path.join(root, directory, "index.ts"),
            `export * from "./${filename}";`,
          );
        }
        await Deno.writeTextFile(
          path.join(root, "main.ts"),
          `
          import * as first from "./first/index.ts";
          import * as second from "./second/index.ts";
          export const styles = [first.css, second.css];
          ${
            filename.includes(".module")
              ? "export const classes = [first.box, second.box];"
              : ""
          }
        `,
        );
        const result = await build("", ["main.ts"], {
          absWorkingDir: root,
          bundle: true,
          plugins: [postCSSPlugin()],
        });
        const output = await import(
          `data:application/javascript,${
            encodeURIComponent(result.outputFiles[0].text)
          }`
        );
        assertStringIncludes(output.styles[0], "red");
        assertStringIncludes(output.styles[1], "blue");
        if (filename.includes(".module")) {
          assertNotEquals(output.classes[0], output.classes[1]);
        }
      } finally {
        await Deno.remove(root, { recursive: true });
      }
    });
  }

  for (const customSelector of [false, true]) {
    it(`disables module rewriting and JSON output with ${customSelector ? "a custom selector" : "the filename convention"}`, async () => {
      const root = await Deno.makeTempDir({ prefix: "postcss disabled " });
      try {
        const file = path.join(root, "styles.module.css");
        await Deno.writeTextFile(file, ".original { color: red; }");
        const result = await build("", [file], {
          absWorkingDir: root,
          plugins: [
            postCSSPlugin({
              modules: false,
              ...(customSelector ? { isModule: () => true } : {}),
            }),
          ],
        });
        assertStringIncludes(result.outputFiles[0].text, ".original {");
        assertEquals(result.errors, []);
        await assertRejects(
          () => Deno.stat(`${file}.json`),
          Deno.errors.NotFound,
        );
      } finally {
        await Deno.remove(root, { recursive: true });
      }
    });
  }
});
