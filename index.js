#!/usr/bin/env node
const program = require('commander');
const bundle = require('./bundle');
const docker = require('./docker');
const helmCharts = require('helm-charts');
const {getCommitHash, getBranchName, extractDockerTags, getVersionWithHash} = require('./utils');
const pkg = Object.assign({
    docker: {},
    helmCharts: {},
    bundle: {}
}, require(process.cwd() + '/package.json'));

// docker commands
program
    .command('docker-build <path>')
    .description('Builds an image from a Dockerfile')
    .option('-r, --registry [registry]', 'The docker registry url', pkg.docker.registry)
    .option('-n, --name [name]', 'The docker image name', pkg.name)
    .option('-v, --version [version]', 'The docker image version', pkg.version)
    .option('-t, --tag [tags]', 'An image tags if different than in versioning convention', collect)
    .option('--build-arg [list]', 'Sets build-time variables', collect, [])
    .action((path, options) => {
        const commitHash = getCommitHash();
        const branchName = getBranchName();
        const tags = options.tag || extractDockerTags(options.version, commitHash);

        docker.build({
            registry: options.registry,
            path,
            imageName: options.name,
            tags,
            labels: {commitId: commitHash, branch: branchName},
            buildArgs: [`PKG_NAME=${options.name}`, `PKG_VERSION=${options.version}`].concat(options.buildArg)
        });
    });

program
    .command('docker-push')
    .description('Pushes an image to a registry')
    .option('-r, --registry [registry]', 'The docker registry url', pkg.docker.registry)
    .option('-n, --name [name]', 'The docker image name', pkg.name)
    .option('-v, --version [version]', 'The docker image version', pkg.version)
    .option('-t, --tag [tags]', 'An image tags if different than in versioning convention', collect)
    .action((options) => {
        const tags = options.tag || extractDockerTags(options.version, getCommitHash());

        docker.push({registry: options.registry, imageName: options.name, tags});
    });

// helm commands
program
    .command('helm-charts-build')
    .option('-s, --source [source]', 'A directory with chart sources. It can either be a directory with a single Charts.yaml file or with subdirectories defining multiple charts', '.')
    .option('-o, --output [output]', 'A directory chart packages should be produced in', 'charts-output')
    .option('-v, --version [version]', 'A chart version if different than set the version in \'package.json\'', pkg.version)
    .option('--appVersion [appVersion]', 'An appVersion if different than set the version in \'package.json\'', pkg.version)
    .description('Builds all charts from the specified directory, places them in the ./charts-output directory and generates a repo index.')
    .action(async (options) => {
        const commitHash = getCommitHash();
        const version = options.version.endsWith('-SNAPSHOT') ? getVersionWithHash(options.version, commitHash) : options.version;
        const appVersion = options.appVersion.endsWith('-SNAPSHOT') ? getVersionWithHash(options.appVersion, commitHash) : options.appVersion;

        await helmCharts.build({
            source: options.source,
            output: options.output,
            version,
            appVersion,
        });
    });

program
    .command('helm-charts-push')
    .option('-c, --chartsDir [chartsDir]', 'A directory containing built charts packages', 'charts-output')
    .option('-r, --registry [registry]', 'The helm charts registry url', pkg.helmCharts.registry)
    .option('-u, --username [username]', 'The username for the Helm charts registry')
    .option('-p, --password [password]', 'The password for the Helm charts registry')
    .description('Pushes all charts from the ./charts-output directory to a raw registry specified in the package.json file.')
    .action(async (options) => {

        await helmCharts.publish({
            chartsDir: options.chartsDir,
            repository: options.registry,
            username: options.username,
            password: options.password
        });
    });

// bundle commands
program
    .command('bundle-create <path>')
    .option('-n, --name [name]', 'The bundle name', pkg.name)
    .option('-s, --suffix [suffix]', 'A suffix that will be added to bundle name. Default is a version form the \'package.json\' file.', pkg.version)
    .description('Bundles a directory to zip archive')
    .action(async (path, options) => {
        const bundleName = getBundleName(options.name, options.suffix);
        await bundle.create({path, output: bundleName});
    });

program
    .command('bundle-push')
    .option('-n, --name [name]', 'The bundle name', pkg.name)
    .option('-s, --suffix [suffix]', 'A suffix that will be added to bundle name. Default is a version form the \'package.json\' file.', pkg.version)
    .option('-u, --username [username]', 'The username for the HTTP registry.')
    .option('-p, --password [password]', 'The password for the HTTP registry.')
    .option('-r, --registry [registry]', 'The HTTP registry url', pkg.bundle.registry)
    .description('Pushes a bundle to a registry')
    .action(async (options) => {
        const bundleName = getBundleName(options.name, options.suffix);
        await bundle.push({
            path: bundleName,
            destinationUrl: options.registry + `/${bundleName}`,
            username: options.username,
            password: options.password
        });
    });

program.on('command:*', () => {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exitCode = 1;
});

program.parse(process.argv);

process.on('unhandledRejection', (error) => {
    console.error(error);
    process.exitCode = 1;
});

function getBundleName(name, suffix) {
    return `${name}-${suffix}.zip`;
}

function collect(value, memory = []) {
    memory.push(value);
    return memory;
}