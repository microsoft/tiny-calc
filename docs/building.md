## Building Tiny-Calc
Tiny-Calc uses [@microsoft/rush](https://rushjs.io/) under the covers for monorepo management, but you
can use the standard NPM commands from the root of the repo:

```sh
> npm i            # Links monorepo projects and installs NPM dependencies
> npm run build    # Builds all projects
> npm test         # Tests all projects
```

You can also use `npm run build` and `npm test` within package folders to build individual modules.
For example:

```sh
> cd packages/common/binary
> npm run build
> npm test
```

However, when modifying package.json files to add/remove dependencies, you will want to use Rush rather
than `npm install` to update `node_modules`.

You can do this by issuing the following command from the root of your repo, which will scan *all* packages
for changes and update `node_modules` in each.


```ts
npm run rush -- update
```

### Using Rush
For convenience, globally install the rush command line tool:

```sh
npm i -g @microsoft/rush
```

(Note that the version of Rush doesn't matter as Rush inspects 'rush.json' at the project root and
automatically downloads/caches the version specified there.)

#### Common Rush Commands

| What                                        | Compare to                | Rush command                                                        |
|---------------------------------------------|---------------------------|---------------------------------------------------------------------|
| install modules after git pull/merge        | `npm ci`                  | `rush install`                                                      |
| update modules after modifying package.json | `npm i`                   | `rush update`                                                       |
| build                                       | `npm run build`           | `rush build`                                                        |
| add a new module to package.json            | `npm i somepackage --dev` | `rush add -p somepackage --dev --caret`                             |

#### Tips
* You can incrementally build a specific package like this `rush build --to @tiny-calc/binary`.  This will transitively build
  everything required to run/test @tiny-calc/binary (and skip everything else.)
* Most rush commands are global (i.e., can be run from any directory in the monorepo).
  * `rush add` is one of the few exeptions.  Run this within the package directory to which you want to add a dependency.

## Publishing
```sh
> npm login
> rush version --bump
> rush publish --include-all --tag prerelease --publish --set-access-level public
> npm logout
```
