#!/usr/bin/env node

const program = require('commander');
const bundle = require('./bundle');
const docker = require('./docker');
const helmCharts = require('helm-charts');
const sh = require('./sh');
const pkg = require(process.cwd() + '/package.json');

// docker commands

program
    .command('docker-build <path>')
    .description('Builds an image from a Dockerfile')
    .action(async (path) => {
        const commitHash = await getCommitHash();
        const branchName = await getBranchName();
        const tags = extractDockerTags(commitHash);
        console.log(tags);
        await docker.build({registry: pkg.docker.registry, path, imageName: pkg.name, tags, labels: {commitId: commitHash, branch: branchName}});
    });

program
    .command('docker-push')
    .option('-f, --force', 'Publishing a stable version is not allowed from branch other than master. Use this flag if you want to publish it anyway.')
    .description('Pushes an image to a registry')
    .action(async (options) => {
        if (!options.force) {
            const branch = await getBranchName();
            ensureBranchIsAllowed(branch);
        }

        const commitHash = await getCommitHash();
        const tags = extractDockerTags(commitHash);

        await docker.push({registry: pkg.docker.registry, imageName: pkg.name, tags});
    });

// helm commands

program
    .command('helm-charts-build')
    .option('-s, --source [source]', 'A directory with chart sources. It can either be a directory with a single Charts.yaml file or with subdirectories defining multiple charts', '.')
    .option('-o, --output [output]', 'A directory chart packages should be produced in', 'charts-output')
    .description('Builds all charts from the specified directory, places them in the ./charts-output directory and generates a repo index.')
    .action(async (options) => {
        const commitHash = await getCommitHash();
        let chartVersion = pkg.version;
        if (pkg.version.endsWith('-SNAPSHOT')) {
            chartVersion = getVersionWithHash(commitHash);
        }

        await helmCharts.build({
            source: options.source,
            output: options.output,
            version: chartVersion,
            appVersion: chartVersion
        });
    });

program
    .command('helm-charts-push')
    .option('-c, --chartsDir [chartsDir]', 'A directory containing built charts packages', 'charts-output')
    .option('-u, --username [username]', 'The username for the Helm charts registry')
    .option('-p, --password [password]', 'The password for the Helm charts registry')
    .option('-f, --force', 'Publishing a stable version is not allowed from branch other than master. Use this flag if you want to publish it anyway.')
    .description('Pushes all charts from the ./charts-output directory to a raw registry specified in the package.json file.')
    .action(async (options) => {
        if (!options.force) {
            const branch = await getBranchName();
            ensureBranchIsAllowed(branch);
        }

        await helmCharts.publish({
            chartsDir: options.chartsDir,
            repository: pkg.helmCharts.registry,
            username: options.username,
            password: options.password
        });
    });

// bundle commands

program
    .command('bundle-create <path>')
    .description('Bundles a directory to zip archive')
    .action(async (path) => {
        const bundleName = getBundleName();
        await bundle.create({path, output: bundleName});
    });

program
    .command('bundle-push')
    .option('-f, --force', 'Publishing a stable version is not allowed from branch other than master. Use this flag if you want to publish it anyway.')
    .option('-u, --username [username]', 'The username for the HTTP registry.')
    .option('-p, --password [password]', 'The password for the HTTP registry.')
    .description('Pushes a bundle to a registry')
    .action(async (options) => {
        const branch = await getBranchName();
        if (!options.force) {
            ensureBranchIsAllowed(branch);
        }

        const bundleName = getBundleName();
        await bundle.push({path: bundleName, destinationUrl: pkg.bundle.registry, username: options.username, password: options.password});
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

function getBundleName() {
    return `${pkg.name}-${pkg.version}.zip`;
}

function extractDockerTags(commitHash) {
    const tags = [pkg.version];

    if (pkg.version.endsWith('-SNAPSHOT')) {
        // tags for develop version: 1.2.3-SNAPSHOT, 1.2.3-g0351d42, unstable
        tags.push(getVersionWithHash(commitHash));
        tags.push('unstable');
    } else {
        // tags for stable version: 1.2.3, 1.2, 1, stable, latest
        const versionParts = pkg.version.split('.');
        tags.push('stable');
        tags.push('latest');
        tags.push(versionParts[0]);
        tags.push(`${versionParts[0]}.${versionParts[1]}`);
    }

    return tags;
}

function getVersionWithHash(commitHash) {
    return pkg.version.replace('SNAPSHOT', 'g' + commitHash.substring(0, 7));
}

function ensureBranchIsAllowed(branch) {
    if (!pkg.version.endsWith('-SNAPSHOT') && branch !== 'master') {
        throw new Error('Cannot publish a stable version from branch other than master. Use the --force flag if you want to publish it anyway.');
    }
}

async function getBranchName() {
    return (await sh('git symbolic-ref --short HEAD')).trim();
}

async function getCommitHash() {
    return (await sh('git rev-parse HEAD')).trim();
}



