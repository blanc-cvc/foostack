'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileJSFileAsBinary = void 0;
const logger_1 = require("./logger");
const node_fetch_1 = __importDefault(require("node-fetch"));
const tar_1 = __importDefault(require("tar"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const os_1 = __importDefault(require("os"));
const rimraf_1 = __importDefault(require("rimraf"));
const crypto_1 = __importDefault(require("crypto"));
const util_1 = require("util");
const fs_1 = require("fs");
const native_addons_1 = require("./native-addons");
const executable_metadata_1 = require("./executable-metadata");
const helpers_1 = require("./helpers");
const nv_1 = __importDefault(require("@pkgjs/nv"));
const url_1 = require("url");
const child_process_1 = require("child_process");
const events_1 = require("events");
async function getNodeSourceForVersion(range, dir, logger, retries = 2) {
    logger.stepStarting(`Looking for Node.js version matching ${JSON.stringify(range)}`);
    let inputIsFileUrl = false;
    try {
        inputIsFileUrl = new url_1.URL(range).protocol === 'file:';
    }
    catch (_a) { }
    if (inputIsFileUrl) {
        logger.stepStarting(`Extracting tarball from ${range} to ${dir}`);
        await fs_1.promises.mkdir(dir, { recursive: true });
        await helpers_1.pipeline(fs_1.createReadStream(url_1.fileURLToPath(range)), zlib_1.default.createGunzip(), tar_1.default.x({
            cwd: dir
        }));
        logger.stepCompleted();
        const filesInDir = await fs_1.promises.readdir(dir, { withFileTypes: true });
        const dirsInDir = filesInDir.filter(f => f.isDirectory());
        if (dirsInDir.length !== 1) {
            throw new Error('Node.js tarballs should contain exactly one directory');
        }
        return path_1.default.join(dir, dirsInDir[0].name);
    }
    let releaseBaseUrl;
    let version;
    if (range.match(/-nightly\d+/)) {
        version = range.startsWith('v') ? range : `v${range}`;
        releaseBaseUrl = `https://nodejs.org/download/nightly/${version}`;
    }
    else {
        const ver = (await nv_1.default(range)).pop();
        if (!ver) {
            throw new Error(`No node version found for ${range}`);
        }
        version = `v${ver.version}`;
        releaseBaseUrl = `https://nodejs.org/download/release/${version}`;
    }
    const tarballName = `node-${version}.tar.gz`;
    const cachedTarballPath = path_1.default.join(dir, tarballName);
    let hasCachedTarball = false;
    try {
        hasCachedTarball = (await fs_1.promises.stat(cachedTarballPath)).size > 0;
    }
    catch (_b) { }
    if (hasCachedTarball) {
        const shaSumsUrl = `${releaseBaseUrl}/SHASUMS256.txt`;
        logger.stepStarting(`Verifying existing tarball via ${shaSumsUrl}`);
        const [expectedSha, realSha] = await Promise.all([
            (async () => {
                try {
                    const shaSums = await node_fetch_1.default(shaSumsUrl);
                    if (!shaSums.ok)
                        return;
                    const text = await shaSums.text();
                    for (const line of text.split('\n')) {
                        if (line.trim().endsWith(tarballName)) {
                            return line.match(/^([0-9a-fA-F]+)\b/)[0];
                        }
                    }
                }
                catch (_a) { }
            })(),
            (async () => {
                const hash = crypto_1.default.createHash('sha256');
                await helpers_1.pipeline(fs_1.createReadStream(cachedTarballPath), hash);
                return hash.digest('hex');
            })()
        ]);
        if (expectedSha === realSha) {
            logger.stepStarting('Unpacking existing tarball');
        }
        else {
            logger.stepFailed(new Error(`SHA256 mismatch: got ${realSha}, expected ${expectedSha}`));
            hasCachedTarball = false;
        }
    }
    let tarballStream;
    let tarballWritePromise;
    if (hasCachedTarball) {
      if (!fs_1.existsSync(path_1.default.join(dir, `node-${version}`))) {
        tarballStream = fs_1.createReadStream(cachedTarballPath);
      }
    }
    else {
        const url = `${releaseBaseUrl}/${tarballName}`;
        logger.stepStarting(`Downloading from ${url}`);
        const tarball = await node_fetch_1.default(url);
        if (!tarball.ok) {
            throw new Error(`Could not download Node.js source tarball: ${tarball.statusText}`);
        }
        logger.stepStarting(`Unpacking tarball to ${dir}`);
        await fs_1.promises.mkdir(dir, { recursive: true });
        const contentLength = +tarball.headers.get('Content-Length');
        if (contentLength) {
            logger.startProgress(contentLength);
            let downloaded = 0;
            tarball.body.on('data', (chunk) => {
                downloaded += chunk.length;
                logger.doProgress(downloaded);
            });
        }
        tarballStream = tarball.body;
        tarballWritePromise =
            helpers_1.pipeline(tarball.body, fs_1.createWriteStream(cachedTarballPath));
    }
    if (!fs_1.existsSync(path_1.default.join(dir, `node-${version}`))) {
      try {
        await Promise.race([
            Promise.all([
                helpers_1.pipeline(tarballStream, zlib_1.default.createGunzip(), tar_1.default.x({
                    cwd: dir
                })),
                tarballWritePromise
            ]),
            events_1.once(process, 'beforeExit').then(() => {
                throw new Error('premature exit from the event loop');
            })
        ]);
      }
      catch (err) {
        if (retries > 0) {
            logger.stepFailed(err);
            logger.stepStarting('Re-trying');
            return await getNodeSourceForVersion(range, dir, logger, retries - 1);
        }
        throw err;
      }
    }
    logger.stepCompleted();
    return path_1.default.join(dir, `node-${version}`);
}
async function getNodeVersionFromSourceDirectory(dir) {
    var _a, _b, _c, _d, _e, _f;
    const versionFile = await fs_1.promises.readFile(path_1.default.join(dir, 'src', 'node_version.h'), 'utf8');
    const major = +((_b = (_a = versionFile.match(/^#define\s+NODE_MAJOR_VERSION\s+(?<version>\d+)\s*$/m)) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.version);
    const minor = +((_d = (_c = versionFile.match(/^#define\s+NODE_MINOR_VERSION\s+(?<version>\d+)\s*$/m)) === null || _c === void 0 ? void 0 : _c.groups) === null || _d === void 0 ? void 0 : _d.version);
    const patch = +((_f = (_e = versionFile.match(/^#define\s+NODE_PATCH_VERSION\s+(?<version>\d+)\s*$/m)) === null || _e === void 0 ? void 0 : _e.groups) === null || _f === void 0 ? void 0 : _f.version);
    return [major, minor, patch];
}
async function compileNode(sourcePath, linkedJSModules, buildArgs, makeArgs, env, logger) {
    logger.stepStarting('Compiling Node.js from source');
    const cpus = os_1.default.cpus().length;
    const options = {
        cwd: sourcePath,
        logger: logger,
        env: env
    };
    const nodeVersion = await getNodeVersionFromSourceDirectory(sourcePath);
    if (nodeVersion[0] > 19 || (nodeVersion[0] === 19 && nodeVersion[1] >= 4)) {
        if (process.platform !== 'win32') {
            buildArgs = ['--dest-cpu', 'arm64', '--dest-os', 'linux', '--v8-disable-maglev', '--v8-options', '""', '--without-corepack', '--without-amaro', '--without-node-code-cache', '--without-node-options', '--without-npm', '--no-cross-compiling', '--fully-static', '--without-sqlite', '--openssl-no-asm', '--v8-lite-mode', '--without-intl', '--without-inspector', '--v8-disable-object-print', ...buildArgs];
        }
        else {
            buildArgs = ['no-shared-roheap', ...buildArgs];
        }
    }
    if (process.platform !== 'win32') {
        const configure = ['./configure', ...buildArgs];
        for (const module of linkedJSModules) {
            configure.push('--link-module', module);
        }
        await helpers_1.spawnBuildCommand(configure, options);
        if (configure.includes('--fully-static') || configure.includes('--partly-static')) {
          
            // if grep -R "\-lrt" ./out  remove -static
            // grep -R "static" ./out
            for (const file of [
                'out/tools/v8_gypfiles/torque-language-server.target.mk',
                'out/tools/v8_gypfiles/torque.target.mk',
                'out/tools/v8_gypfiles/gen-regexp-special-case.target.mk',
                'out/tools/v8_gypfiles/bytecode_builtins_list_generator.target.mk',
                'out/tools/v8_gypfiles/mksnapshot.target.mk',
                'out/node_js2c.target.mk',
            ]) {
                const target = path_1.default.join(sourcePath, file);
                try {
                    await fs_1.promises.stat(target);
                }
                catch (_a) {
                    continue;
                }
                let source = await fs_1.promises.readFile(target, 'utf8');
                source = source.replace(/-static/g, '');
                await fs_1.promises.writeFile(target, source);
            }
            const filenodegyp = path_1.default.join(sourcePath, 'node.gyp');
            let stringnodegyp = await fs_1.promises.readFile(filenodegyp, 'utf8');
            stringnodegyp = stringnodegyp.split('\n');
            stringnodegyp.splice(1195-1,382);
            stringnodegyp = stringnodegyp.join('\n');
            //await fs_1.promises.writeFile(filenodegyp, stringnodegyp);
            
            if (!fs_1.existsSync(path_1.default.join(sourcePath, 'files-patched'))) {
              
              let files_android = require('child_process').execSync(`grep -rl "__ANDROID_" ${sourcePath}`).toString();
              files_android = files_android.split('\n');
              for (const filepath of files_android) {
                if (filepath != '') {
                  let stringfile = await fs_1.promises.readFile(filepath, 'utf8');
                  stringfile = stringfile.replace(/__ANDROID_/g, '__ANDROIDnot_');
                  await fs_1.promises.writeFile(filepath, stringfile);
                }
              }
              
              const file1 = path_1.default.join(sourcePath, 'deps/v8/src/base/debug/stack_trace_posix.cc');
              let s1 = await fs_1.promises.readFile(file1, 'utf8');
              s1 = s1.replace(/HAVE_EXECINFO_H 1/g, 'HAVE_EXECINFO_H 0');
              await fs_1.promises.writeFile(file1, s1);
            
              const file2 = path_1.default.join(sourcePath, 'deps/cares/src/lib/ares_getnameinfo.c');
              let s2 = await fs_1.promises.readFile(file2, 'utf8');
              s2 = s2.split('\n');
              s2.splice(316-1,1);
              s2.splice(302-1,12);
              //s2.splice(300-1,1);
              s2 = s2.join('\n');
              await fs_1.promises.writeFile(file2, s2);
              
              const file3 = path_1.default.join(sourcePath, 'deps/openssl/openssl/include/crypto/rand.h');
              let s3 = await fs_1.promises.readFile(file3, 'utf8');
              s3 = s3.split('\n');
              s3[34-1] = '# define __ANDROIDnot__ 0';
              s3 = s3.join('\n');
              await fs_1.promises.writeFile(file3, s3);
              
              const file4 = path_1.default.join(sourcePath, 'deps/uv/src/unix/thread.c');
              let s4 = await fs_1.promises.readFile(file4, 'utf8');
              s4 = s4.split('\n');
              s4.splice(250-1,3);
              s4.splice(245-1,1);
              s4.splice(222-1,3);
              s4.splice(217-1,1);
              s4 = s4.join('\n');
              await fs_1.promises.writeFile(file4, s4);
              
              fs_1.mkdirSync(path_1.default.join(sourcePath, 'files-patched'));
            }
        }
        const make = ['make', ...makeArgs];
        if (!make.some((arg) => /^-j/.test(arg))) {
            make.push(`-j${cpus == 0 ? "4" : cpus}`);
        }
        if (!make.some((arg) => /^V=/.test(arg))) {
            make.push('V=');
        }
        await helpers_1.spawnBuildCommand(make, options);
        return path_1.default.join(sourcePath, 'out', 'Release', 'node');
    }
    else {
        await fs_1.promises.rm(path_1.default.join(sourcePath, 'out', 'Release'), {
            recursive: true,
            force: true
        });
        const vcbuildArgs = [...buildArgs, ...makeArgs, 'projgen'];
        if (!vcbuildArgs.includes('debug') && !vcbuildArgs.includes('release')) {
            vcbuildArgs.push('release');
        }
        if (!vcbuildArgs.some((arg) => /^vs/.test(arg))) {
            vcbuildArgs.push('vs2019');
        }
        for (const module of linkedJSModules) {
            vcbuildArgs.push('link-module', module);
        }
        await helpers_1.spawnBuildCommand(['cmd', '/c', '.\\vcbuild.bat', ...vcbuildArgs], options);
        return path_1.default.join(sourcePath, 'Release', 'node.exe');
    }
}
async function compileJSFileAsBinaryImpl(options, logger) {
    var _a, _b;
    if (!options.sourceFile.endsWith('.js')) {
        throw new Error(`Only .js files can be compiled (got: ${options.sourceFile})`);
    }
    await fs_1.promises.access(options.sourceFile);
    const namespace = options.namespace || path_1.default.basename(options.sourceFile, '.js');
    if (!options.tmpdir) {
        options.tmpdir = path_1.default.join(os_1.default.tmpdir(), 'boxednode', namespace);
    }
    const nodeSourcePath = await getNodeSourceForVersion(options.nodeVersionRange, options.tmpdir, logger);
    const nodeVersion = await getNodeVersionFromSourceDirectory(nodeSourcePath);
    const requireMappings = [];
    const extraJSSourceFiles = [];
    const enableBindingsPatch = (_a = options.enableBindingsPatch) !== null && _a !== void 0 ? _a : ((_b = options.addons) === null || _b === void 0 ? void 0 : _b.length) > 0;
    const jsMainSource = await fs_1.promises.readFile(options.sourceFile, 'utf8');
    const registerFunctions = [];
    {
        const extraGypDependencies = [];
        for (const addon of (options.addons || [])) {
            const addonResult = await native_addons_1.modifyAddonGyp(addon, nodeSourcePath, options.env || process.env, logger);
            for (const { linkedModuleName, targetName, registerFunction } of addonResult) {
                requireMappings.push([addon.requireRegexp, linkedModuleName]);
                extraGypDependencies.push(targetName);
                registerFunctions.push(registerFunction);
            }
        }
        logger.stepStarting('Finalizing linked addons processing');
        const nodeGypPath = path_1.default.join(nodeSourcePath, 'node.gyp');
        const nodeGyp = await native_addons_1.loadGYPConfig(nodeGypPath);
        const mainTarget = nodeGyp.targets.find((target) => ['<(node_core_target_name)', 'node'].includes(target.target_name));
        mainTarget.dependencies = [...(mainTarget.dependencies || []), ...extraGypDependencies];
        await native_addons_1.storeGYPConfig(nodeGypPath, nodeGyp);
        for (const header of ['node.h', 'node_api.h']) {
            const source = (await fs_1.promises.readFile(path_1.default.join(nodeSourcePath, 'src', header), 'utf8') +
                await fs_1.promises.readFile(path_1.default.join(__dirname, '..', 'resources', `add-${header}`), 'utf8'));
            await fs_1.promises.writeFile(path_1.default.join(nodeSourcePath, 'src', header), source);
        }
        logger.stepCompleted();
    }
    logger.stepStarting('Inserting custom code into Node.js source');
    let entryPointTrampolineSource = await fs_1.promises.readFile(path_1.default.join(__dirname, '..', 'resources', 'entry-point-trampoline.js'), 'utf8');
    entryPointTrampolineSource = entryPointTrampolineSource.replace(/\bREPLACE_WITH_BOXEDNODE_CONFIG\b/g, JSON.stringify({
        requireMappings: requireMappings.map(([re, linked]) => [re.source, re.flags, linked]),
        enableBindingsPatch
    }));
    const { customCodeSource, customCodeConfigureParam, customCodeEntryPoint } = nodeVersion[0] >= 20
        ? {
            customCodeSource: path_1.default.join(nodeSourcePath, 'lib-boxednode', `${namespace}.js`),
            customCodeConfigureParam: `./lib-boxednode/${namespace}.js`,
            customCodeEntryPoint: `lib-boxednode/${namespace}`
        } : {
        customCodeSource: path_1.default.join(nodeSourcePath, 'lib', namespace, `${namespace}.js`),
        customCodeConfigureParam: `./lib/${namespace}/${namespace}.js`,
        customCodeEntryPoint: `${namespace}/${namespace}`
    };
    await fs_1.promises.mkdir(path_1.default.dirname(customCodeSource), { recursive: true });
    await fs_1.promises.writeFile(customCodeSource, entryPointTrampolineSource);
    extraJSSourceFiles.push(customCodeConfigureParam);
    logger.stepCompleted();
    logger.stepStarting('Storing executable metadata');
    const resPath = path_1.default.join(nodeSourcePath, 'src', 'res');
    await fs_1.promises.writeFile(path_1.default.join(resPath, 'node.rc'), await executable_metadata_1.generateRCFile(resPath, options.targetFile, options.executableMetadata));
    logger.stepCompleted();
    if (options.preCompileHook) {
        logger.stepStarting('Running pre-compile hook');
        await options.preCompileHook(nodeSourcePath, options);
        logger.stepCompleted();
    }
    const createBlobDefinition = options.compressBlobs
        ? helpers_1.createCompressedBlobDefinition
        : helpers_1.createUncompressedBlobDefinition;
    async function writeMainFileAndCompile({ codeCacheBlob = new Uint8Array(0), codeCacheMode = 'ignore', snapshotBlob = new Uint8Array(0), snapshotMode = 'ignore' } = {}) {
        logger.stepStarting('Handling main file source');
        let mainSource = await fs_1.promises.readFile(path_1.default.join(__dirname, '..', 'resources', 'main-template.cc'), 'utf8');
        mainSource = mainSource.replace(/\bREPLACE_WITH_ENTRY_POINT\b/g, JSON.stringify(customCodeEntryPoint));
        mainSource = mainSource.replace(/\bREPLACE_DECLARE_LINKED_MODULES\b/g, registerFunctions.map((fn) => `void ${fn}(const void**,const void**);\n`).join(''));
        mainSource = mainSource.replace(/\bREPLACE_DEFINE_LINKED_MODULES\b/g, registerFunctions.map((fn) => `${fn},`).join(''));
        mainSource = mainSource.replace(/\bREPLACE_WITH_MAIN_SCRIPT_SOURCE_GETTER\b/g, helpers_1.createCppJsStringDefinition('GetBoxednodeMainScriptSource', snapshotMode !== 'consume' ? jsMainSource : '') + '\n' +
            await createBlobDefinition('GetBoxednodeCodeCache', codeCacheBlob) + '\n' +
            await createBlobDefinition('GetBoxednodeSnapshotBlob', snapshotBlob));
        mainSource = mainSource.replace(/\bBOXEDNODE_CODE_CACHE_MODE\b/g, JSON.stringify(codeCacheMode));
        if (options.useLegacyDefaultUvLoop) {
            mainSource = `#define BOXEDNODE_USE_DEFAULT_UV_LOOP 1\n${mainSource}`;
        }
        if (snapshotMode === 'generate') {
            mainSource = `#define BOXEDNODE_GENERATE_SNAPSHOT 1\n${mainSource}`;
        }
        if (snapshotMode === 'consume') {
            mainSource = `#define BOXEDNODE_CONSUME_SNAPSHOT 1\n${mainSource}`;
        }
        if (options.nodeSnapshotConfigFlags) {
            const flags = [
                '0',
                ...options.nodeSnapshotConfigFlags.map(flag => `static_cast<std::underlying_type<SnapshotFlags>::type>(SnapshotFlags::k${flag})`)
            ].join(' | ');
            mainSource = `#define BOXEDNODE_SNAPSHOT_CONFIG_FLAGS (static_cast<SnapshotFlags>(${flags}))\n${mainSource}`;
        }
        await fs_1.promises.writeFile(path_1.default.join(nodeSourcePath, 'src', 'node_main.cc'), mainSource);
        logger.stepCompleted();
        return await compileNode(nodeSourcePath, extraJSSourceFiles, options.configureArgs, options.makeArgs, options.env || process.env, logger);
    }
    let binaryPath;
    if (!options.useCodeCache && !options.useNodeSnapshot) {
        binaryPath = await writeMainFileAndCompile();
    }
    else {
        binaryPath = await writeMainFileAndCompile({
            codeCacheMode: options.useNodeSnapshot ? 'ignore' : 'generate',
            snapshotMode: options.useNodeSnapshot ? 'generate' : 'ignore'
        });
        const intermediateFile = path_1.default.join(nodeSourcePath, 'intermediate.out');
        logger.stepStarting('Running code cache/snapshot generation');
        await fs_1.promises.rm(intermediateFile, { force: true });
        await util_1.promisify(child_process_1.execFile)(binaryPath, { cwd: nodeSourcePath });
        const result = await fs_1.promises.readFile(intermediateFile);
        if (result.length === 0) {
            throw new Error('Empty code cache/snapshot result');
        }
        logger.stepCompleted();
        binaryPath = await writeMainFileAndCompile(options.useNodeSnapshot ? {
            snapshotBlob: result,
            snapshotMode: 'consume'
        } : {
            codeCacheBlob: result,
            codeCacheMode: 'consume'
        });
    }
    logger.stepStarting(`Moving resulting binary to ${options.targetFile}`);
    await fs_1.promises.mkdir(path_1.default.dirname(options.targetFile), { recursive: true });
    await fs_1.promises.copyFile(binaryPath, options.targetFile);
    logger.stepCompleted();
    if (options.clean) {
        logger.stepStarting('Cleaning temporary directory');
        await util_1.promisify(rimraf_1.default)(options.tmpdir, { glob: false });
        logger.stepCompleted();
    }
}
function parseEnvVarArgList(value) {
    if (!value)
        return [];
    try {
        return JSON.parse(value);
    }
    catch (_a) {
        return value.split(',');
    }
}
async function compileJSFileAsBinary(options) {
    const logger = options.logger || new logger_1.LoggerImpl();
    const configureArgs = [...(options.configureArgs || [])];
    configureArgs.push(...parseEnvVarArgList(process.env.BOXEDNODE_CONFIGURE_ARGS));
    const makeArgs = [...(options.makeArgs || [])];
    makeArgs.push(...parseEnvVarArgList(process.env.BOXEDNODE_MAKE_ARGS));
    try {
        await compileJSFileAsBinaryImpl({
            ...options,
            configureArgs,
            makeArgs
        }, logger);
    }
    catch (err) {
        logger.stepFailed(err);
        throw err;
    }
}
exports.compileJSFileAsBinary = compileJSFileAsBinary;
//# sourceMappingURL=index.js.map