import { extractRequires, getAbsoluteEntryPath, RequireOptions, IPackageInformation } from "./Utils";

import * as fs from "fs";
import * as path from "path";


/**
 *
 *
 * @export
 * @class Module
 */
export class Module {
    /**
     *
     *
     * @type {string}
     * @memberOf Module
     */
    public contents: string;
    /**
     *
     *
     * @type {string}
     * @memberOf Module
     */
    public dir: string;
    /**
     *
     *
     * @type {Module[]}
     * @memberOf Module
     */
    public dependencies: Module[] = [];
    public packageInfo: IPackageInformation;
    /**
     * Creates an instance of Module.
     *
     * @param {string} [absPath]
     *
     * @memberOf Module
     */
    constructor(public absPath?: string) {
        if (!absPath) {
            return;
        }
        if (!path.isAbsolute(absPath)) {
            absPath = getAbsoluteEntryPath(absPath);
        }
        this.absPath = this.ensureExtension(absPath);
        this.dir = path.dirname(absPath);
    }
    /**
     *
     *
     * @param {string} dir
     *
     * @memberOf Module
     */
    public setDir(dir: string) {
        this.dir = dir;
    }

    public setPackage(info: IPackageInformation) {
        this.packageInfo = info;
    }

    /**
     *
     *
     * @returns {RequireOptions[]}
     *
     * @memberOf Module
     */
    public digest(): RequireOptions[] {
        if (!this.absPath) {
            return [];
        }

        if (!fs.existsSync(this.absPath)) {
            console.warn("File ", this.absPath, "Does not exist");
            this.contents = "";
            return [];
        }
        this.contents = fs.readFileSync(this.absPath).toString();

        // if it's a json
        if (this.absPath.match(/\.json$/)) {
            // Modify contents so they exports the json
            this.contents = "module.exports = " + this.contents;
        }

        // extract dependencies in case of a javascript file
        if (this.absPath.match(/\.js$/)) {
            let reqs = extractRequires(this.contents, true);
            return reqs;
        }
        return [];
    }

    /**
     *
     *
     * @param {string} name
     * @returns
     *
     * @memberOf Module
     */
    public getAbsolutePathOfModule(name: string, packageInfo?: IPackageInformation) {
        if (path.isAbsolute(name)) {
            return name;
        }
        let mpath = path.join(this.dir, name);
        let target = this.ensureExtension(mpath);
        if (packageInfo && !fs.existsSync(target)) {
            return packageInfo.entry;
        }
        return target;
    }

    /**
     *
     *
     * @param {Module} module
     *
     * @memberOf Module
     */
    public addDependency(module: Module) {
        this.dependencies.push(module);
    }

    /**
     *
     *
     * @param {Module} [entry]
     * @param {string} [userRootPath]
     * @returns
     *
     * @memberOf Module
     */
    public getProjectPath(entry?: Module, userRootPath?: string) {

        let root = userRootPath || this.dir ?
            this.dir : path.dirname(entry && entry.absPath ? entry.absPath : this.absPath);

        if (this.packageInfo) {
            root = this.packageInfo.root;
        }
        let input = this.absPath;
        input = input.replace(/\\/g, "/");
        root = root.replace(/\\/g, "/");//
        input = input.replace(root, "");
        input = input.replace(/^\/|\\/, "");
        return input;
    }

    /**
     * stuff.some.boo.bar -> to test
     *
     * @private
     * @param {string} name
     * @returns
     *
     * @memberOf Module
     */
    private ensureExtension(name: string) {

        if (!name.match(/\.\w{1,}$/)) {
            if (name.match(/\/$/)) {

                return name + "index.js";
            } else {
                // gotta try folder
                let folderIndex = `${name}/index.js`;
                if (fs.existsSync(folderIndex)) {
                    return folderIndex;
                }
            }
            return name + ".js";
        }
        return name;
    }
}