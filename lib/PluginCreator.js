"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginCreator = void 0;
var resolve = require("resolve");
var util_1 = require("util");
var patchCreateProgram_1 = require("./patchCreateProgram");
function createTransformerFromPattern(_a) {
    var typescript = _a.typescript, factory = _a.factory, config = _a.config, program = _a.program, ls = _a.ls;
    var transform = config.transform, after = config.after, afterDeclarations = config.afterDeclarations, name = config.name, type = config.type, cleanConfig = __rest(config, ["transform", "after", "afterDeclarations", "name", "type"]);
    if (!transform)
        throw new Error('Not a valid config entry: "transform" key not found');
    var ret;
    switch (config.type) {
        case 'ls':
            if (!ls)
                throw new Error("Plugin " + transform + " need a LanguageService");
            ret = factory(ls, cleanConfig);
            break;
        case 'config':
            if (!program)
                throw new Error("Plugin " + transform + " needs a Program");
            ret = factory(cleanConfig);
            break;
        case 'compilerOptions':
            if (!program)
                throw new Error("Plugin " + transform + " needs a Program");
            ret = factory(program.getCompilerOptions(), cleanConfig);
            break;
        case 'checker':
            if (!program)
                throw new Error("Plugin " + transform + " needs a Program");
            ret = factory(program.getTypeChecker(), cleanConfig);
            break;
        case undefined:
        case 'program':
            if (!program)
                throw new Error("Plugin " + transform + " needs a Program");
            ret = factory(program, cleanConfig, {
                ts: typescript,
                addDiagnostic: patchCreateProgram_1.addDiagnosticFactory(program),
            });
            break;
        case 'raw':
            if (!program)
                throw new Error("Plugin " + transform + " needs a Program");
            ret = function (ctx) { return factory(ctx, program, cleanConfig); };
            break;
        case 'middleware':
            ret = factory(cleanConfig, typescript);
            break;
        default:
            return never(config.type);
    }
    if (typeof ret === 'function') {
        if (after)
            return { after: ret };
        else if (afterDeclarations) {
            return { afterDeclarations: ret };
        }
        else
            return { before: ret };
    }
    return ret;
}
function never(n) {
    throw new Error('Unexpected type: ' + n);
}
var tsNodeIncluded = false;
// to fix recursion bug, see usage below
var requireStack = [];
/**
 * @example
 *
 * new PluginCreator([
 *   {transform: '@zerollup/ts-transform-paths', someOption: '123'},
 *   {transform: '@zerollup/ts-transform-paths', type: 'ls', someOption: '123'},
 *   {transform: '@zerollup/ts-transform-paths', type: 'ls', after: true, someOption: '123'}
 * ]).createTransformers({ program })
 */
var PluginCreator = /** @class */ (function () {
    function PluginCreator(typescript, configs, resolveBaseDir) {
        if (resolveBaseDir === void 0) { resolveBaseDir = process.cwd(); }
        this.typescript = typescript;
        this.configs = configs;
        this.resolveBaseDir = resolveBaseDir;
        this.validateConfigs(configs);
    }
    PluginCreator.prototype.mergeTransformers = function (into, source) {
        var _a, _b, _c;
        var slice = function (input) { return (Array.isArray(input) ? input.slice() : [input]); };
        if (source.before) {
            (_a = into.before).push.apply(_a, slice(source.before));
        }
        if (source.after) {
            (_b = into.after).push.apply(_b, slice(source.after));
        }
        if (source.afterDeclarations) {
            (_c = into.afterDeclarations).push.apply(_c, slice(source.afterDeclarations));
        }
        return this;
    };
    PluginCreator.prototype.createTransformers = function (params, customTransformers) {
        var chain = {
            before: [],
            after: [],
            afterDeclarations: [],
        };
        var ls;
        var program;
        if ('ls' in params) {
            ls = params.ls;
            program = ls.getProgram();
        }
        else {
            program = params.program;
        }
        for (var _i = 0, _a = this.configs; _i < _a.length; _i++) {
            var config = _a[_i];
            if (config.type === 'middleware')
                continue;
            if (!config.transform)
                continue;
            var factory = this.resolveFactory(config.transform, config.import);
            // if recursion
            if (factory === undefined)
                continue;
            var transformer = createTransformerFromPattern({
                typescript: this.typescript,
                factory: factory,
                config: config,
                program: program,
                ls: ls,
            });
            this.mergeTransformers(chain, transformer);
        }
        // if we're given some custom transformers, they must be chained at the end
        if (customTransformers) {
            this.mergeTransformers(chain, customTransformers);
        }
        return chain;
    };
    PluginCreator.prototype.composeMiddlewareTransformers = function (inner, outer) {
        inner.createProgram = this.composeMiddlewares(inner.createProgram, outer.createProgram);
    };
    PluginCreator.prototype.composeMiddlewares = function (inner, outer) {
        if (!inner) {
            throw new Error('inner middleware must exist');
        }
        if (!outer) {
            return inner;
        }
        return (function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return outer.apply(void 0, __spreadArrays(args, [function () {
                    var newArgs = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        newArgs[_i] = arguments[_i];
                    }
                    newArgs = newArgs.length === 0 ? args : newArgs;
                    return inner.apply(void 0, newArgs);
                }]));
        });
    };
    PluginCreator.prototype.createMiddlewares = function (originEntries) {
        var chain = {
            createProgram: function (opts) { return originEntries.createProgram(opts); }
        };
        for (var _i = 0, _a = this.configs; _i < _a.length; _i++) {
            var config = _a[_i];
            if (config.type !== 'middleware')
                continue;
            if (!config.transform)
                continue;
            var factory = this.resolveFactory(config.transform, config.import);
            // if recursion
            if (factory === undefined)
                continue;
            var transformer = createTransformerFromPattern({
                typescript: this.typescript,
                factory: factory,
                config: config
            });
            this.composeMiddlewareTransformers(chain, transformer);
        }
        return chain;
    };
    PluginCreator.prototype.resolveFactory = function (transform, importKey) {
        if (importKey === void 0) { importKey = 'default'; }
        if (!tsNodeIncluded &&
            transform.match(/\.tsx?$/) &&
            (module.parent.parent === null ||
                module.parent.parent.parent === null ||
                module.parent.parent.parent.id.split(/[\/\\]/).indexOf('ts-node') === -1)) {
            require('ts-node').register({
                transpileOnly: true,
                skipProject: true,
                compilerOptions: {
                    target: 'ES2018',
                    jsx: 'react',
                    esModuleInterop: true,
                    module: 'commonjs',
                },
            });
            tsNodeIncluded = true;
        }
        var modulePath = resolve.sync(transform, { basedir: this.resolveBaseDir });
        // in ts-node occurs error cause recursion:
        //   ts-node file.ts -> createTransformers -> require transformer.ts
        //        -> createTransformers -> require transformer.ts -> ...
        //   this happens cause ts-node uses to compile transformers the same config included this transformer
        //   so this stack checks that if we already required this file we are in the reqursion
        if (requireStack.indexOf(modulePath) > -1)
            return;
        requireStack.push(modulePath);
        var commonjsModule = require(modulePath);
        requireStack.pop();
        var factoryModule = typeof commonjsModule === 'function' ? { default: commonjsModule } : commonjsModule;
        var factory = factoryModule[importKey];
        if (!factory) {
            throw new Error("tsconfig.json > plugins: \"" + transform + "\" does not have an export \"" + importKey + "\": " +
                util_1.inspect(factoryModule));
        }
        if (typeof factory !== 'function') {
            throw new Error("tsconfig.json > plugins: \"" + transform + "\" export \"" + importKey + "\" is not a plugin: \"" + util_1.inspect(factory) + "\"");
        }
        return factory;
    };
    PluginCreator.prototype.validateConfigs = function (configs) {
        for (var _i = 0, configs_1 = configs; _i < configs_1.length; _i++) {
            var config = configs_1[_i];
            if (!config.name && !config.transform) {
                throw new Error('tsconfig.json plugins error: transform must be present');
            }
        }
    };
    return PluginCreator;
}());
exports.PluginCreator = PluginCreator;
