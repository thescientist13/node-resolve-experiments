# node-resolve-experiments

## Overview

This repo is for experimenting with Node's module resolution logic to evaluate it for usage in programmatically looking up the location of npm packages on disk.

## Setup

To play around with this repo and follow along, make sure you have current NodeJS installed (`>=16.x`).  You can check your environment accordingly

```sh
% node -v
v16.4.2

% npm -v
7.18.1
```

After cloning, run `npm ci`.

> _[**nvm**](https://github.com/nvm-sh/nvm) is helpful if you want to manage different versions of NodeJS on your local machine._

### Commands

You can run either of two commands to see the results documented below:
- `npm run serve:cjs` - to start the CJS example server
- `npm run serve:esm` - to start the ESM example server

Open `localhost:3000` to view the demo / console output.

## Problem Statement

When writing frontend JavaScript, you may want to take advantage of some package from npm, like [**Lit**](https://lit.dev/).

```js
import { LitElement } from 'lit';
```

If we were using `require` (CJS) or `import` (ESM) in Node natively, NodeJS (and / or a bundler) would handle:

1. Finding where on disk the top level of the package resides
1. Determing from its _package.json_ what the correct entry point to resolve to is

However, in browser land there is of course, none of that.

So what are we to do?

## The Challenge

While we have [`importmap`](https://github.com/WICG/import-maps) for being able to link these bare specifiers to an actual file on disk

ex.
```html
<script type="importmap-shim">
  {
    "imports": {
      "lit-element": "/node_modules/lit-element/lit-element.js",
      "lit-html/lib/shady-render.js": "/node_modules/lit-html/lib/shady-render.js",
      "lit-html/lit-html.js": "/node_modules/lit-html/lit-html.js",
      "lit-html": "/node_modules/lit-html/lit-html.js"
    }
  }
</script>
```

And setting up a server to help route those requests accordingly from browser to filesystem isn't too hard, there's still the matter of actually knowing _where specifically_ this file on disk actually lives.  

We might just assume that everything lives at the root of a project in its _node_modules_ directory, but this is not always the case:
- Package Managers may create nested _node_modules_ within the top level _node_modules_ to handle duplicates or honor semver package needs, or put them all in a shared location (like [**pnpm**](https://pnpm.io/))
- The point above may come even more into play when dealing with workspaces and monorepos.
- Where does `npx` put all those dependencies when it runs?


Basically, it all boils down to at best, you can guess and maybe use some heuristics but since Node has all this logic built in already for CommonJS and ESM, maybe we should find a way to tap into that same logic, just like if we were to use  `require` or `import`.

> _**Note**: as alluded to above, just knowing where the package resides is only part of the challenge.  Second challenge is knowing if you need CJS vs ESM and what entry point, etc etc.  We'll see if we can try and solve that too!_

## Solution(s) (WIP)

1. Initial suggestion when reaching out in NodeJS Slack was to try using [`require.resolve`](https://nodejs.org/api/modules.html#modules_require_resolve_request_options) to see if that would provide the information we are looking for.  Will try this first.

## Conclusions

### `require.resolve`

This seems promising so far, with the following code (see it in _server.js_)
```js
console.debug('require.resolve(lit) =>', require.resolve('lit'));
console.debug('require.resolve.paths(lit) =>', require.resolve.paths('lit'));
```

Yielding the following output:
```sh
require.resolve(lit) => /Users/owenbuckley/Workspace/github/repos/node-resolve-expirements/node_modules/lit/index.js
require.resolve.paths(lit) => [
  '/Users/owenbuckley/Workspace/github/repos/node-resolve-expirements/node_modules',
  '/Users/owenbuckley/Workspace/github/repos/node_modules',
  '/Users/owenbuckley/Workspace/github/node_modules',
  '/Users/owenbuckley/Workspace/node_modules',
  '/Users/owenbuckley/node_modules',
  '/Users/node_modules',
  '/node_modules',
  '/Users/owenbuckley/.node_modules',
  '/Users/owenbuckley/.node_libraries',
  '/Users/owenbuckley/.nvm/versions/node/v14.16.0/lib/node'
]
```

I think though since we are using CJS in _server.js_, we are getting Lit's CJS entry point as defined in [_package.json#main_](https://unpkg.com/browse/lit@2.0.0-rc.2/package.json)
```json
"main": "index.js",
"module": "index.js",
"type": "module",
"exports": {
  ".": {
    "default": "./index.js"
  },
  "./decorators.js": {
    "default": "./decorators.js"
  },
  "./decorators/": {
    "default": "./decorators/"
  },
  "./directive-helpers.js": {
    "default": "./directive-helpers.js"
  },
  "./directive.js": {
    "default": "./directive.js"
  },
  "./directives/": {
    "default": "./directives/"
  },
  "./async-directive.js": {
    "default": "./async-directive.js"
  },
  "./html.js": {
    "default": "./html.js"
  },
  "./experimental-hydrate-support.js": {
    "default": "./experimental-hydrate-support.js"
  },
  "./experimental-hydrate.js": {
    "default": "./experimental-hydrate.js"
  },
  "./polyfill-support.js": {
    "default": "./polyfill-support.js"
  },
  "./static-html.js": {
    "default": "./static-html.js"
  }
},
```

Ideally we want to (make sure) we are getting something from `exports` (map) or `module` in _package.json_.

So either we need to:
- only be using ESM for our NodeJS code (something we will try next!)
- force NodeJS to lookup ESM explicitely. assuming that if already using ESM, this would be the default, right?  (what would a fallback looklike though?)
- or otherwise just use `require.resolve` as the starting point of our adventure, and use our own logic to decide what file we want to return to the browser, of which we want to favor ESM exclusively, or eles detect + convert _CJS -> ESM_ on the fly?


#### `import.meta`

In _server.mjs_, we can start using ESM, and although we no longer have access to `require`, when using the `--experimental-import-meta-resolve` flag, we can now use `import.meta.resolve` instead.

And indeed, for the following code
```js
console.debug('import.meta.resolve(lit) =>', await import.meta.resolve('lit'));
```

we can see the following output
```sh
import.meta.resolve(lit) => file:///Users/owenbuckley/Workspace/github/repos/node-resolve-experiments/node_modules/lit/index.js
```

Since _index.js_ is the same for both CJS and ESM entry points for **Lit**, I might add another test package wherein the difference between the two is perhaps not as ambiguous, just to make sure we are indeed getting the expected results, e.g. a guaranteed ESM first entry point?  (assuming it exists)

#### Differing Entry Points

So after adding a couple more packages, **redux** and **lodash**, I was a little surprised by the findings.  It looks like the results are the same for both CJS and ESM versions?  (Aside from the obvious difference that ESM uses `file://` protocol)

Specifically for **redux**, which [ships a `main` and a `module` entry in its _package.json_](https://unpkg.com/browse/redux@4.1.0/package.json), I would have expected the following:
* **CJS** - _path/to/node_modules/redux/lib/redux.js_
* **ESM** - _path/to/node_modules/redux/es/redux.mjs_

_CommonJS (`require.resolve`)_
```json
{
  "lit": "/Users/owenbuckley/Workspace/github/repos/node-resolve-experiments/node_modules/lit/index.js",
  "lodash": "/Users/owenbuckley/Workspace/github/repos/node-resolve-experiments/node_modules/lodash/lodash.js",
  "redux": "/Users/owenbuckley/Workspace/github/repos/node-resolve-experiments/node_modules/redux/lib/redux.js"
}
```

_ESM (`import.meta.resolve`)_
```json
{
  "lit": "file:///Users/owenbuckley/Workspace/github/repos/node-resolve-experiments/node_modules/lit/index.js",
  "lodash": "file:///Users/owenbuckley/Workspace/github/repos/node-resolve-experiments/node_modules/lodash/lodash.js",
  "redux": "file:///Users/owenbuckley/Workspace/github/repos/node-resolve-experiments/node_modules/redux/lib/redux.js"
}
```

However, both are returning _redux/lib/redux.js_?  Is this the [expected result](https://nodejs.org/api/packages.html#packages_determining_module_system)?  🤔

**Update**: Yes, it looks like the above is indeed [the expected behavior](https://stackoverflow.com/questions/42708484/what-is-the-module-package-json-field-for).  Appears `module` was just a [community convention](https://levelup.gitconnected.com/code-splitting-for-libraries-bundling-for-npm-with-rollup-1-0-2522c7437697#9f6f) so as far as NodeJS is concerned, it really comes down to just [`main` or an `exports` map](https://nodejs.org/api/packages.html#packages_main_entry_point_export).

So for a userland tool perhaps in the absence of an `exports` map supporting `module` could be an option, but ideally always favor an `exports` map so as to spec compliant.