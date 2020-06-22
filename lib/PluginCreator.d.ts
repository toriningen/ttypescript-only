import * as ts from 'typescript';
export interface PluginConfig {
    /**
     * Language Server TypeScript Plugin name
     */
    name?: string;
    /**
     * Path to transformer or transformer module name
     */
    transform?: string;
    /**
     * The optional name of the exported transform plugin in the transform module.
     */
    import?: string;
    /**
     * Plugin entry point format type, default is program
     */
    type?: 'ls' | 'program' | 'config' | 'checker' | 'raw' | 'compilerOptions' | 'middleware';
    /**
     * Should transformer applied after all ones
     */
    after?: boolean;
    /**
     * Should transformer applied for d.ts files, supports from TS2.9
     */
    afterDeclarations?: boolean;
}
export declare type CreateProgramMiddlewareNext = (createProgramOptions?: ts.CreateProgramOptions) => ts.Program;
export declare type CreateProgramMiddlewareHead = (createProgramOptions: ts.CreateProgramOptions) => ts.Program;
export declare type CreateProgramMiddleware = (createProgramOptions: ts.CreateProgramOptions, next: CreateProgramMiddlewareNext) => ts.Program;
declare module 'typescript' {
    interface Middleware {
        createProgram?: CreateProgramMiddleware;
    }
    interface MiddlewareHead {
        createProgram: CreateProgramMiddlewareHead;
    }
}
export declare type OriginEntries = {
    createProgram: typeof ts.createProgram;
};
export interface TransformerBasePlugin extends ts.Middleware {
    before?: ts.TransformerFactory<ts.SourceFile>;
    after?: ts.TransformerFactory<ts.SourceFile>;
    afterDeclarations?: ts.TransformerFactory<ts.SourceFile | ts.Bundle>;
}
export declare type TransformerList = Required<ts.CustomTransformers>;
export declare type TransformerPlugin = TransformerBasePlugin | ts.TransformerFactory<ts.SourceFile>;
export declare type LSPattern = (ls: ts.LanguageService, config: {}) => TransformerPlugin;
export declare type ProgramPattern = (program: ts.Program, config: {}, helpers?: {
    ts: typeof ts;
    addDiagnostic: (diag: ts.Diagnostic) => void;
}) => TransformerPlugin;
export declare type CompilerOptionsPattern = (compilerOpts: ts.CompilerOptions, config: {}) => TransformerPlugin;
export declare type ConfigPattern = (config: {}) => TransformerPlugin;
export declare type TypeCheckerPattern = (checker: ts.TypeChecker, config: {}) => TransformerPlugin;
export declare type RawPattern = (context: ts.TransformationContext, program: ts.Program, config: {}) => ts.Transformer<ts.SourceFile>;
export declare type MiddlewarePattern = (config: {}, typescript: typeof ts) => ts.Middleware;
export declare type PluginFactory = LSPattern | ProgramPattern | ConfigPattern | CompilerOptionsPattern | TypeCheckerPattern | RawPattern | MiddlewarePattern;
/**
 * @example
 *
 * new PluginCreator([
 *   {transform: '@zerollup/ts-transform-paths', someOption: '123'},
 *   {transform: '@zerollup/ts-transform-paths', type: 'ls', someOption: '123'},
 *   {transform: '@zerollup/ts-transform-paths', type: 'ls', after: true, someOption: '123'}
 * ]).createTransformers({ program })
 */
export declare class PluginCreator {
    private typescript;
    private configs;
    private resolveBaseDir;
    constructor(typescript: typeof ts, configs: PluginConfig[], resolveBaseDir?: string);
    mergeTransformers(into: TransformerList, source: ts.CustomTransformers | TransformerBasePlugin): this;
    createTransformers(params: {
        program: ts.Program;
    } | {
        ls: ts.LanguageService;
    }, customTransformers?: ts.CustomTransformers): Required<ts.CustomTransformers>;
    private composeMiddlewareTransformers;
    private composeMiddlewares;
    createMiddlewares(originEntries: OriginEntries): ts.MiddlewareHead;
    private resolveFactory;
    private validateConfigs;
}
