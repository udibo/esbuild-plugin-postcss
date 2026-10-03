import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { deadline } from "@std/async/deadline";
import * as path from "@std/path";
import { describe, it } from "@std/testing/bdd";

async function readExample(heading: string): Promise<string> {
  const readme = (await Deno.readTextFile(
    new URL("./README.md", import.meta.url),
  )).replace(/\r\n/g, "\n");
  const start = readme.indexOf(`${heading}\n`);
  assert(start >= 0, `Missing README section: ${heading}`);
  const remaining = readme.slice(start + heading.length + 1);
  const end = remaining.search(/\n#{1,6} /);
  const section = end < 0 ? remaining : remaining.slice(0, end);
  const blocks = [...section.matchAll(/```ts\n([\s\S]*?)\n```/g)];
  const example = blocks.find((block) => block[1]!.includes("esbuild.build("));
  assert(example, `Missing build example: ${heading}`);
  return example[1]!;
}

async function stopChild(
  child: Deno.ChildProcess,
  pending: Promise<Deno.CommandOutput>,
) {
  try {
    try {
      child.kill("SIGTERM");
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  } finally {
    await pending.catch(() => {});
  }
}
async function runExample(
  heading: string,
  modules: boolean,
  rejectCompilation = false,
) {
  const directory = await Deno.makeTempDir({ prefix: "postcss-readme-" });
  try {
    await Deno.mkdir(path.join(directory, "src"));
    await Deno.writeTextFile(
      path.join(directory, "src", modules ? "main.module.css" : "index.css"),
      modules ? ".title { color: green; }" : ".box { color: red; }",
    );
    await Deno.writeTextFile(
      path.join(directory, "postcss.config.ts"),
      rejectCompilation
        ? `export default {
  modules: false,
  plugins: [{
    postcssPlugin: "documented-build-failure",
    Once() { throw new Error("Expected documented compilation failure"); },
  }],
};`
        : "export default { modules: false };",
    );
    const eventsFile = path.join(directory, "events.txt");
    await Deno.writeTextFile(eventsFile, "");
    const observerFile = path.join(directory, "esbuild-observer.ts");
    await Deno.writeTextFile(
      observerFile,
      `import actual from "actual-esbuild";
export * from "actual-esbuild";
const eventsFile = ${JSON.stringify(eventsFile)};
function record(event: string) {
  Deno.writeTextFileSync(eventsFile, event + "\\n", { append: true });
}
export function build(options: import("actual-esbuild").BuildOptions) {
  return actual.build(options).then((result) => {
    record("build fulfilled");
    return result;
  }, (error) => {
    record("build rejected");
    throw error;
  });
}
export async function stop() {
  record("stop started");
  await actual.stop();
  record("stop settled");
}
export default { ...actual, build, stop };
`,
    );
    const config = JSON.parse(
      await Deno.readTextFile(new URL("./deno.json", import.meta.url)),
    );
    const lock = JSON.parse(
      await Deno.readTextFile(new URL("./deno.lock", import.meta.url)),
    );
    lock.workspace.links = {
      ...lock.workspace.links,
      [`jsr:${config.name}@${config.version}`]: {
        dependencies: lock.workspace.dependencies,
      },
    };
    const lockFile = path.join(directory, "deno.lock");
    await Deno.writeTextFile(lockFile, JSON.stringify(lock));
    const configFile = path.join(directory, "deno.json");
    await Deno.writeTextFile(
      configFile,
      JSON.stringify({
        workspace: [],
        nodeModulesDir: "none",
        lock: lockFile,
        imports: {
          ...config.imports,
          esbuild: path.toFileUrl(observerFile).href,
          "actual-esbuild": config.imports.esbuild,
          "@udibo/esbuild-plugin-postcss": new URL(
            "./postcss.ts",
            import.meta.url,
          ).href,
        },
      }),
    );
    const exampleFile = path.join(directory, "example.ts");
    await Deno.writeTextFile(exampleFile, await readExample(heading));
    const child = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--quiet",
        "--cached-only",
        "--frozen",
        `--config=${configFile}`,
        "--allow-read",
        `--allow-write=${directory}`,
        "--allow-env",
        "--allow-run",
        "--allow-sys",
        exampleFile,
      ],
      cwd: directory,
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    let finished = false;
    const pending = child.output().finally(() => {
      finished = true;
    });
    let output: Deno.CommandOutput;
    try {
      output = await deadline(pending, 15_000);
    } finally {
      if (!finished) await stopChild(child, pending);
    }
    const stderr = new TextDecoder().decode(output.stderr);
    const events = (await Deno.readTextFile(eventsFile)).trim().split("\n")
      .filter(Boolean);
    const css = output.success
      ? await Deno.readTextFile(
        path.join(directory, "dist", modules ? "main.module.css" : "index.css"),
      )
      : "";
    const classMap = modules && output.success
      ? JSON.parse(
        await Deno.readTextFile(
          path.join(directory, "src", "main.module.css.json"),
        ),
      ) as Record<string, string>
      : undefined;
    return { output, stderr, events, css, classMap };
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
}

const CONFIGURATION_HEADING =
  "#### Separating postcss configuration from esbuild configuration";

describe("documented one-shot builds", () => {
  it("finishes the actual configuration example before stopping esbuild", async () => {
    const result = await runExample(CONFIGURATION_HEADING, false);
    assertEquals(result.output.success, true, result.stderr);
    assertMatch(result.css, /color:\s*red/);
    assertEquals(result.events, [
      "build fulfilled",
      "stop started",
      "stop settled",
    ]);
  });

  it("finishes the actual CSS Module example with its matching class map", async () => {
    const result = await runExample("### CSS Modules", true);
    assertEquals(result.output.success, true, result.stderr);
    assertMatch(result.css, /color:\s*green/);
    assert(result.classMap?.title);
    assertStringIncludes(result.css, `.${result.classMap.title}`);
    assertEquals(result.events, [
      "build fulfilled",
      "stop started",
      "stop settled",
    ]);
  });

  it("propagates real compilation failure after joining owned service cleanup", async () => {
    const result = await runExample(CONFIGURATION_HEADING, false, true);
    assertEquals(result.output.success, false);
    assertStringIncludes(
      result.stderr,
      "Expected documented compilation failure",
    );
    assertEquals(result.events, [
      "build rejected",
      "stop started",
      "stop settled",
    ]);
  });
});
