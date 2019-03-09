const fs = require('fs');
const path = require('path');
const spawn = require('cross-spawn');

const sh = (cmd, options = {}) => {
    const opt = Object.assign({log: true}, options);
    if (opt.log) {
        opt.cwd ? console.log(`> ${cmd} in ${opt.cwd}`) : console.log(`> ${cmd}`);
    }

    const commandArr = cmd.split(/\s+/);
    const procName = commandArr[0];
    const proc = spawn.sync(procName, commandArr.splice(1), opt);
    if (proc.error) {
        throw new Error(proc.error);
    }
    if (proc.status !== 0) {
        throw new Error(`Unsuccessful status code: ${proc.status}`);
    }
    if (proc.stdout) {
        const output = proc.stdout.toString().trim();
        console.log(output);
        return output;
    }
    return null;
};

const extractDockerTags = (version, commitHash) => {
    const tags = [version];

    if (version.endsWith('-SNAPSHOT')) {
        // tags for develop version: 1.2.3-SNAPSHOT, 1.2.3-g0351d42, unstable
        tags.push(getVersionWithHash(version, commitHash));
        tags.push('unstable');
    } else {
        // tags for stable version: 1.2.3, 1.2, 1, stable, latest
        const versionParts = version.split('.');
        tags.push('stable');
        tags.push('latest');
        tags.push(versionParts[0]);
        tags.push(`${versionParts[0]}.${versionParts[1]}`);
    }

    return tags;
};

const getVersionWithHash = (version, commitHash) => {
    return version.replace('SNAPSHOT', 'g' + commitHash.substring(0, 7));
};

const getBranchName = () => {
    return sh('git symbolic-ref --short HEAD');
};

const getCommitHash = () => {
    return sh('git rev-parse HEAD');
};

const createDirectory = (filePath) => {
    const dirName = path.dirname(filePath);
    if (!fs.existsSync(dirName)) {
        createDirectory(dirName);
        fs.mkdirSync(dirName);
    }
};

const copyFile = (source, destination) => {
    console.log(`Copy file from ${source} to ${destination}.`);
    createDirectory(destination);
    fs.createReadStream(source).pipe(fs.createWriteStream(destination));
};

const isDirectory = source => fs.lstatSync(source).isDirectory();
const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);

module.exports = {
    sh,
    extractDockerTags,
    getVersionWithHash,
    getBranchName,
    getCommitHash,
    createDirectory,
    copyFile,
    isDirectory,
    getDirectories
};