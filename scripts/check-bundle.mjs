import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const directory = new URL("../dist/assets/", import.meta.url);
const files = await readdir(directory);
const sizes = new Map(await Promise.all(files.filter(file => file.endsWith(".js")).map(async file => [file, (await stat(join(directory.pathname, file))).size])));
const entry = [...sizes].find(([name]) => /^index-.*\.js$/.test(name));
if (!entry) throw new Error("Production entry bundle was not found");
if (entry[1] > 100_000) throw new Error(`Application entry bundle is ${entry[1]} bytes; budget is 100000`);
const editor = [...sizes].find(([name]) => name.startsWith("editor-vendor-"));
if (!editor || editor[1] > 500_000) throw new Error(`Editor vendor bundle is missing or exceeds the 500000-byte budget`);
const workspaces = [...sizes.keys()].filter(name => /Panel-|ProjectLauncher-/.test(name));
if (workspaces.length < 10) throw new Error(`Expected at least 10 on-demand workspace chunks; found ${workspaces.length}`);
console.log(`Bundle budgets passed: entry ${entry[1]} bytes, editor ${editor[1]} bytes, ${workspaces.length} on-demand workspaces.`);
