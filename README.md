# esbuild PostCSS Plugin

[![JSR](https://jsr.io/badges/@udibo/esbuild-plugin-postcss)](https://jsr.io/@udibo/esbuild-plugin-postcss)
[![JSR Score](https://jsr.io/badges/@udibo/esbuild-plugin-postcss/score)](https://jsr.io/@udibo/esbuild-plugin-postcss)
[![CI/CD](https://github.com/udibo/esbuild-plugin-postcss/actions/workflows/main.yml/badge.svg)](https://github.com/udibo/esbuild-plugin-postcss/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/udibo/esbuild-plugin-postcss/branch/main/graph/badge.svg?token=G5XCR01X8E)](https://codecov.io/gh/udibo/esbuild-plugin-postcss)
[![license](https://img.shields.io/github/license/udibo/esbuild-plugin-postcss)](https://github.com/udibo/esbuild-plugin-postcss/blob/main/LICENSE)

## Description

This esbuild plugin makes it easy to use PostCSS with Deno. PostCSS is a tool
for transforming styles with JS plugins. These plugins can lint your CSS,
support variables and mixins, transpile future CSS syntax, inline images, and
more.

## Features

- Supports CSS Modules, Sass, Less, and Stylus.
- Watching for changes and rebuilding.
- Importing css and css modules from JavaScript/TypeScript.

## Documentation

### Outputs

This plugin has two different output formats. When the styles are the main
entrypoint, the plugin will output the css to a file. When the styles are
imported from a JavaScript/TypeScript file, the plugin will output a js file
with the css as a constant along with any css module class names from the file.

### Using with esbuild deno loader plugin

This plugin can be used with the esbuild Deno loader to process CSS files during
bundling. The esbuild Deno loader is a plugin that allows esbuild to import
Deno-specific modules and handle Deno's import/export syntax.

> **Note:** The official `@luca/esbuild-deno-loader` package has compatibility
> issues with other plugins (see
> [Issue #159](https://github.com/lucacasonato/esbuild_deno_loader/issues/159)).
> Until [PR #160](https://github.com/lucacasonato/esbuild_deno_loader/pull/160)
> is merged into the official repository, it's recommended to use the
> `@kylejune/esbuild-deno-loader` fork which fixes this compatibility issue.

Here's an example of how to use this plugin with the esbuild Deno loader:

```ts
import * as esbuild from "esbuild";
import {
  denoLoaderPlugin,
  denoResolverPlugin,
} from "@kylejune/esbuild-deno-loader";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

await esbuild.build({
  plugins: [
    denoResolverPlugin({ configPath }),
    postCSSPlugin({ modules: true }),
    denoLoaderPlugin({ configPath }),
  ],
  entryPoints: ["./src/main.ts"],
  outdir: "./dist",
  bundle: true,
  format: "esm",
});
esbuild.stop();
```

Alternatively, you could remap @luca/esbuild-deno-loader to
@kylejune/esbuild-deno-loader with the following import map entry in your deno
configuration file. This will make it so that you can easily switch back to
using jsr:@luca/esbuild-deno-loader by just changing this line in your import
map..

```json
{
  "imports": {
    "@lucaesbuild-deno-loader": "jsr:@kylejune/esbuild-deno-loader@0.12"
  }
}
```

When using the esbuild Deno loader with this plugin, make sure to:

1. Put the deno resolver plugin before the PostCSS plugin in the plugins array.
2. Put the deno loader plugin after the PostCSS plugin in the plugins array.

This is needed so that your style sheets will use deno to resolve the paths to
import.

For example, if you're using tailwindcss, you'd have the following import
statement. It would use the tailwindcss referenced in your deno configuration
file's import map.

```css
@import "tailwindcss";
```

In this example, "tailwindcss" would resolve to "npm:tailwindcss@4" if you're
deno configuration had the following import map in it.

```json
{
  "imports": {
    "tailwindcss": "npm:tailwindcss@4"
  }
}
```

For configuring postcss, you can either configure it from your build script like
in all of the other examples, or you could create a `postcss.config.ts` file and
use that with the plugin.

The following is an example of a `postcss.config.ts` file.

```ts
import { PostCSSPluginOptions } from "@udibo/esbuild-plugin-postcss";

export default {
  modules: true,
} satisfies PostCSSPluginOptions;
```

Then here is an example of using that configuration file for configuring this
postcss plugin.

```ts
import esbuild from "esbuild";
import tailwindcss from "tailwindcss";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

import postcssConfig from "./tailwind.config.ts";

esbuild.build({
  plugins: [
    postCSSPlugin(postcssConfig),
  ],
  entryPoints: ["./src/index.css"],
  outdir: "./dist",
  bundle: true,
});
esbuild.stop();
```

### PostCSS plugins

This plugin supports PostCSS plugins. You can pass in a PostCSS plugins through
the plugins option. The plugin will be applied to the css before it is written
to disk.

To learn more about the PostCSS plugins, see the
[PostCSS documentation](https://postcss.org/api/#plugins).

In the following example, the autoprefixer plugin is used to add vendor prefixes
to the css.

```ts
import esbuild from "esbuild";
import autoprefixer from "autoprefixer";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

esbuild.build({
  plugins: [
    postCSSPlugin({
      plugins: [autoprefixer()],
    }),
  ],
  entryPoints: ["./src/index.css"],
  outdir: "./dist",
  bundle: true,
});
esbuild.stop();
```

If this was the `./src/index.css` file:

```css
::placeholder {
  color: gray;
}

.image {
  background-image: url(image@1x.png);
}
@media (min-resolution: 2dppx) {
  .image {
    background-image: url(image@2x.png);
  }
}
```

The output would look like this in the `./dist/index.css` file:

```css
::-moz-placeholder {
  color: gray;
}
::placeholder {
  color: gray;
}
.image {
  background-image: url(image@1x.png);
}
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx) {
  .image {
    background-image: url(image@2x.png);
  }
}
```

#### Tailwindcss v3

This plugin works with Tailwind CSS v3. To use Tailwind CSS with this plugin,
you need to add the tailwindcss plugin to the PostCSS plugins array.

```ts
import esbuild from "esbuild";
import tailwindcss from "tailwindcss";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

esbuild.build({
  plugins: [
    postCSSPlugin({
      plugins: [
        tailwindcss({
          content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
          theme: {
            extend: {},
          },
          plugins: [],
        }),
      ],
    }),
  ],
  entryPoints: ["./src/index.css"],
  outdir: "./dist",
  bundle: true,
});
esbuild.stop();
```

You can also create a `tailwind.config.ts` file and use that with the plugin.

```ts
import esbuild from "esbuild";
import tailwindcss from "tailwindcss";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

import tailwindConfig from "./tailwind.config.ts";

esbuild.build({
  plugins: [
    postCSSPlugin({
      plugins: [
        tailwindcss(tailwindConfig),
      ],
    }),
  ],
  entryPoints: ["./src/index.css"],
  outdir: "./dist",
  bundle: true,
});
esbuild.stop();
```

Then in your main.css file, you would import tailwinds base, components, and
utilities.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### Tailwindcss v4

Tailwind CSS v4 requires a slightly different setup as it has integrated its own
PostCSS plugin. To use Tailwind CSS v4 with this plugin, follow this approach:

```ts
import esbuild from "esbuild";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";
import { tailwindcss } from "@tailwindcss/postcss";

esbuild.build({
  plugins: [
    postCSSPlugin({
      plugins: [
        tailwindcss(),
      ],
    }),
  ],
  entryPoints: ["./src/index.css"],
  outdir: "./dist",
  bundle: true,
});
esbuild.stop();
```

In tailwindcss v4, the configuration is in css. When you import tailwindcss, it
includes the base, components, and utilities.

```css
@import "tailwindcss";
```

To have those imports and plugins use Deno's resolution and import map, you'll
need to use the esbuild deno loader plugin. See
[Using with esbuild deno loader plugin documentation](#using-with-esbuild-deno-loader-plugin)
for more information.

### CSS Modules

This plugin supports CSS Modules. You can pass in the options for CSS Modules
through the plugin options modules property.

To learn more about the CSS Modules options, see the
[CSS Modules documentation](https://www.npmjs.com/package/postcss-modules).

In the following example, the css modules are enabled and using the default
options.

```ts
import esbuild from "esbuild";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";

esbuild.build({
  plugins: [
    postCSSPlugin({
      modules: {
        // options for css modules
      },
    }),
  ],
  entryPoints: ["./src/main.module.css"],
  outdir: "./dist",
  bundle: true,
});
esbuild.stop();
```

If this was the `./src/main.module.css` file:

```css
:global .page {
  padding: 20px;
}

.title {
  composes: title from "./mixins.css";
  color: green;
}

.article {
  font-size: 16px;
}
```

And this was the `./src/mixins.css` file:

```css
.title {
  color: black;
  font-size: 40px;
}

.title:hover {
  color: red;
}
```

The output would look like this in the `./dist/main.module.css` file:

```css
._title_3695r_1 {
  color: black;
  font-size: 40px;
}
._title_3695r_1:hover {
  color: red;
}
.page {
  padding: 20px;
}
._title_wsfbq_5 {
  color: green;
}
._article_wsfbq_10 {
  font-size: 16px;
}
```

Along with the css file, the plugin will also output a `main.module.css.json`
file. This file contains the css modules and the class names. This file is used
to import the css modules in JavaScript/TypeScript. It will be placed next to
the original css file.

```json
{ "title": "_title_wsfbq_5 _title_3695r_1", "article": "_article_wsfbq_10" }
```

Then the css modules can be imported like this in Deno without having to
transpile the TypeScript file first with esbuild.

```ts
import mainModule from "./main.module.css.json" with {
  type: "json",
};

console.log(mainModule.title); // _title_wsfbq_5 _title_3695r_1
console.log(mainModule.article); // _article_wsfbq_10
```

You can also import the css modules in JavaScript/TypeScript files, but you will
have to transpile the TypeScript file first with esbuild before you can use it.

```ts
import { article, title } from "./main.module.css";

console.log(title); // _title_wsfbq_5 _title_3695r_1
console.log(article); // _article_wsfbq_10
```

Like with non css modules, you can also import the generated css file directly
in JavaScript/TypeScript files.

```ts
import { css } from "./main.module.css";

console.log(css); // Logs the generated css file
```

### Preprocessors

This plugin supports using Sass, Less, and Stylus with PostCSS. If you want to
use a preprocessor, you will have to add it to the preprocessors array.

The 3 preprocessors available are:

- Sass: An extension of CSS, adding nested rules, variables, mixins, and more.
- Less: A backwards-compatible language extension for CSS.
- Stylus: An expressive, dynamic, and robust CSS language.

To use a preprocessor, you will have to import the wrapper for the preprocessor
from this esbuild plugin. These wrappers are stored in separate files so that
the preprocessors are only imported when you use them.

- `@udibo/esbuild-plugin-postcss/sass`: Exports the `sassPreprocessor` function.
- `@udibo/esbuild-plugin-postcss/less`: Exports the `lessPreprocessor` function.
- `@udibo/esbuild-plugin-postcss/stylus`: Exports the `stylusPreprocessor`
  function.

Each of these functions take a single argument, which is the options for the
preprocessor. To learn more about the preprocessors and the options for them,
see the [Sass documentation](https://sass-lang.com/documentation/js-api),
[Less documentation](https://lessjs.org/api/), and
[Stylus documentation](https://stylus-lang.com/docs/js-api).

You can use one or more of these preprocessors in the preprocessors array. Below
is an example of using the Sass preprocessor with the default options for it.

```ts
import esbuild from "esbuild";
import { postCSSPlugin } from "@udibo/esbuild-plugin-postcss";
import { sassPreprocessor } from "@udibo/esbuild-plugin-postcss/sass";

esbuild.build({
  plugins: [
    postCSSPlugin({
      preprocessors: [
        sassPreprocessor(),
      ],
    }),
  ],
  entryPoints: ["./src/main.scss"],
  outdir: "./dist",
  bundle: true,
});
esbuild.stop();
```

If this was the `./src/main.scss` file:

```scss
@use "sass:list";
@use "sass:color";

$font-stack: Helvetica, Arial;
$primary-color: #333;

body {
  $font-stack: list.append($font-stack, sans-serif);
  font: $font-stack;
}

a {
  color: $primary-color;

  &:hover {
    color: color.scale($primary-color, $lightness: 20%);
  }
}

@debug $font-stack;
```

The output would look like this in the `./dist/main.css` file:

```css
body {
  font: Helvetica, Arial, sans-serif;
}
a {
  color: #333;
}
a:hover {
  color: rgb(91.8, 91.8, 91.8);
}
```

## Contributing

To contribute, please read the [contributing instruction](CONTRIBUTING.md).
