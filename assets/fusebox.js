(function() {
    var __root__ = this;
    var FuseBox = __root__.FuseBox = (function() {
        var isBrowser = typeof window !== "undefined";
        var modules = isBrowser ? (window.__npm__ = window.__npm__ || {}) : {};
        var getNodeModuleName = function(name) {
            if (!name) { return; }
            let matched = name.match(/^([a-z].*)$/);
            if (matched) {
                return name.split(/\/(.+)?/);
            }
        }

        function getFileDirectory(filePath) {
            return filePath.substring(0, filePath.lastIndexOf('/'));
        }
        var pathJoin = function() {
            var parts = [];
            for (var i = 0, l = arguments.length; i < l; i++) {
                parts = parts.concat(arguments[i].split("/"));
            }
            var newParts = [];
            for (i = 0, l = parts.length; i < l; i++) {
                var part = parts[i];
                if (!part || part === ".") {
                    continue
                }
                if (part === "..") {
                    newParts.pop();
                } else {
                    newParts.push(part);
                }
            }
            if (parts[0] === "") {
                newParts.unshift("")
            }
            return newParts.join("/") || (newParts.length ? "/" : ".");
        }
        var ensureExtension = function(name) {
            var matched = name.match(/\.(\w{1,})$/);
            if (matched) {
                var ext = matched[1];
                let allowed = ["json", "xml", "js"];
                if (allowed.indexOf(ext) === -1) {
                    return name + ".js";
                }
                return name;
            }
            return name + ".js";
        }

        return {
            evaluate: function(moduleName, customPath) {
                if (modules[moduleName]) {
                    let mod = modules[moduleName];
                    if (mod.cache) {
                        return mod.cache;
                    }
                    mod.cache = mod.scope.evaluate(customPath);
                    return mod.cache;
                }
            },
            import: function(userPath, packageName) {
                packageName = packageName || "default";
                if (modules[packageName]) {
                    let mod = modules[packageName];
                    return mod.scope.evaluate(userPath);
                }
            },
            module: function(moduleName, fn) {
                if (modules[moduleName]) {
                    return fn(modules[moduleName].scope)
                }
                var collection = modules[moduleName] = {};
                collection.files = {};
                collection.scope = {
                    file: function(name, fn) {
                        collection.files[name] = {
                            fn: fn
                        }
                    },
                    evaluate: function(_target, base) {
                        var entryName = _target ? pathJoin(base || "/", _target) : collection.entry;

                        if (!entryName) {
                            return;
                        }
                        // verify endings and stuff
                        if (entryName[0] === "/") {
                            entryName = entryName.slice(1, entryName.length)
                        }
                        if (entryName === ".") {
                            entryName = collection.entry;
                        }

                        entryName = ensureExtension(entryName);
                        var entry = collection.files[entryName];
                        if (entry.isLoading) {
                            console.warn("Circular dependency detected!");
                            return;
                        }
                        if (!entry) {
                            let msg = ["File " + entryName + " was not found upon request"];
                            msg.push("In module '" + moduleName + "'");
                            throw new Error(msg.join("\n"))
                        }
                        if (entry.cache) {
                            return entry.cache;
                        }
                        var locals = {};
                        var self = this;
                        entry.isLoading = true;
                        locals.exports = {};
                        locals.require = function(target) {
                            var _module = getNodeModuleName(target);
                            if (_module) {
                                var _moduleName = _module[0];
                                if (_module[1]) {
                                    return FuseBox.import(_module[1], _module[0]);
                                }
                                return FuseBox.evaluate(_moduleName);
                            } else {
                                var baseDir = getFileDirectory(entryName);
                                return self.evaluate(target, baseDir);
                            }
                        }
                        locals.module = { exports: locals.exports }
                        var args = [locals.exports, locals.require, locals.module];
                        entry.fn.apply(this, args);
                        var res = locals.module.exports;
                        entry.cache = res;
                        entry.isLoading = false;
                        return res;
                    },
                    entry: function(name) {
                        collection.entry = name;
                    }
                };
                fn(collection.scope);
            }
        }
    })();
    // contents
    // entry
})();