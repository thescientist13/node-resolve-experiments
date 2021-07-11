# node-resolve-expirements

## Overview

This repo is for experimenting with Node's module resolution logic for programattic lookup of the location of npm packages on disk.

## Setup

To play around with this repo and follow along, make sure you have current NodeJS installed (`>=16.x`).  You can check your environment accordingly

```sh
% node -v
v16.4.2

% npm -v
7.18.1
```


After cloning:

1. Make sure you have current NodeJS installed (`>=16.x`)
1. Run `npm ci`
1. Run `npm start` to start the server
1. Open `localhost:3000` to view the demo app

> _[**nvm**](https://github.com/nvm-sh/nvm) is helpful if you want to manage different versions of NodeJS on your local machine._


## Problem Statement

When writing frontend JavaScript, you may want to take advantage of some package from npm, like [**Lit**](https://lit.dev/).

```js
import { LitElement } from 'lit';
```

If we were using `require` (CJS) or `import` (ESM) in Node, NodeJS (and / or a bundler) would handle:

1. Finding where on disk the top level of the package resides
1. Determing from its _package.json_ what the correct entry point to resolve to is

However, in browser land there is of course, none of that.

So what are we to do?

## The Challenge

While we have [`importMaps`](https://github.com/WICG/import-maps) for being able to link these bare specifiers to an actual file on disk

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


Basically, it all boils down to at best, you can guess and maybe use some heuristics but since Node has all this logic built in already for CommonJS and ESM, maybe we should find a way to tap into that same logic just like if we were to use  `require` or `import` natively in NodeJS.

> _**Note**: as alluded to above, just knowing where the package resides is only part of the challenge.  Second challenge is knowing if you need CJS vs ESM and what entry point, etc etc.  We'll see if we can try and solve that too!_


## Conclusions

TBD