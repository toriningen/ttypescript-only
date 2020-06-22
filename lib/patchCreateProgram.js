"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchCreateProgram = exports.addDiagnosticFactory = exports.transformerErrors = void 0;
var path_1 = require("path");
var PluginCreator_1 = require("./PluginCreator");
exports.transformerErrors = new WeakMap();
function addDiagnosticFactory(program) {
    return function (diag) {
        var arr = exports.transformerErrors.get(program) || [];
        arr.push(diag);
        exports.transformerErrors.set(program, arr);
    };
}
exports.addDiagnosticFactory = addDiagnosticFactory;
function patchCreateProgram(tsm, forceReadConfig, projectDir) {
    if (forceReadConfig === void 0) { forceReadConfig = false; }
    if (projectDir === void 0) { projectDir = process.cwd(); }
    var originCreateProgram = tsm.createProgram;
    function createProgramWithOpts(createProgramOptions) {
        if (forceReadConfig) {
            var info = getConfig(tsm, createProgramOptions.options, createProgramOptions.rootNames, projectDir);
            createProgramOptions.options = info.compilerOptions;
            projectDir = info.projectDir;
        }
        var plugins = preparePluginsFromCompilerOptions(createProgramOptions.options.plugins);
        var pluginCreator = new PluginCreator_1.PluginCreator(tsm, plugins, projectDir);
        var middlewares = pluginCreator.createMiddlewares({
            createProgram: originCreateProgram
        });
        var program = middlewares.createProgram(createProgramOptions);
        var originEmit = program.emit;
        program.emit = function newEmit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers) {
            var mergedTransformers = pluginCreator.createTransformers({ program: program }, customTransformers);
            var result = originEmit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, mergedTransformers);
            // todo: doesn't work with 3.7
            // result.diagnostics = [...result.diagnostics, ...transformerErrors.get(program)!];
            return result;
        };
        return program;
    }
    function createProgram(createProgramOptionsOrRootNames, options, host, oldProgram, configFileParsingDiagnostics) {
        if (Array.isArray(createProgramOptionsOrRootNames)) {
            return createProgramWithOpts({
                rootNames: createProgramOptionsOrRootNames,
                options: options,
                host: host,
                oldProgram: oldProgram,
                configFileParsingDiagnostics: configFileParsingDiagnostics
            });
        }
        else {
            return createProgramWithOpts(createProgramOptionsOrRootNames);
        }
    }
    tsm.createProgram = createProgram;
    return tsm;
}
exports.patchCreateProgram = patchCreateProgram;
function getConfig(tsm, compilerOptions, rootFileNames, defaultDir) {
    if (compilerOptions.configFilePath === undefined) {
        var dir = rootFileNames.length > 0 ? path_1.dirname(rootFileNames[0]) : defaultDir;
        var tsconfigPath = tsm.findConfigFile(dir, tsm.sys.fileExists);
        if (tsconfigPath) {
            var projectDir = path_1.dirname(tsconfigPath);
            var config = readConfig(tsm, tsconfigPath, path_1.dirname(tsconfigPath));
            compilerOptions = __assign(__assign({}, config.options), compilerOptions);
            return {
                projectDir: projectDir,
                compilerOptions: compilerOptions,
            };
        }
    }
    return {
        projectDir: path_1.dirname(compilerOptions.configFilePath),
        compilerOptions: compilerOptions,
    };
}
function readConfig(tsm, configFileNamePath, projectDir) {
    var result = tsm.readConfigFile(configFileNamePath, tsm.sys.readFile);
    if (result.error) {
        throw new Error('tsconfig.json error: ' + result.error.messageText);
    }
    return tsm.parseJsonConfigFileContent(result.config, tsm.sys, projectDir, undefined, configFileNamePath);
}
function preparePluginsFromCompilerOptions(plugins) {
    if (!plugins)
        return [];
    // old transformers system
    if (plugins.length === 1 && plugins[0].customTransformers) {
        var _a = plugins[0].customTransformers, _b = _a.before, before = _b === void 0 ? [] : _b, _c = _a.after, after = _c === void 0 ? [] : _c;
        return __spreadArrays(before.map(function (item) { return ({ transform: item }); }), after.map(function (item) { return ({ transform: item, after: true }); }));
    }
    return plugins;
}
