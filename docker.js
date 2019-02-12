const {sh} = require('./utils');
const dockerRegistryClient = require('docker-registry-client');

const getTags = (repository, username, password) => {
    const dockerClient = dockerRegistryClient.createClientV2({
        name: repository,
        username,
        password
    });
    return new Promise((resolve, reject) => {
        dockerClient.listTags((exception, response) => {
            dockerClient.close();
            if (exception) {
                const errors = exception.body.errors || [];
                // If registry does not have any tag in the repository, it throws a NAME_UNKNOWN error, so we return an empty array in that case.
                if (errors.some(error => error.code === 'NAME_UNKNOWN')) {
                    resolve([]);
                } else {
                    reject(exception);
                }
            } else {
                resolve(response.tags || []);
            }
        });
    });
};

class Docker {

    build({registry, path = '.', imageName, tags = [], labels = {}, buildArgs = []}) {
        if (!imageName) {
            throw new Error('Missing image name.')
        }
        if (!registry) {
            throw new Error('Missing registry url configuration.')
        }

        const tagsOption = tags.map(tag => `--tag ${registry}/${imageName}:${tag}`);
        const labelsOption = Object.getOwnPropertyNames(labels).map(label => `--label ${label}=${labels[label]}`);
        const buildArgsOption = buildArgs.map(buildArg => `--build-arg ${buildArg}`);

        sh(`docker image build ${tagsOption.join(' ')} ${labelsOption.join(' ')} ${buildArgsOption.join(' ')} ${path}`, {stdio: 'inherit'});
    }

    async push({registry, imageName, tags = [], noOverwrite, username, password}) {
        if (!imageName) {
            throw new Error('Missing image name.')
        }
        if (!registry) {
            throw new Error('Missing registry url configuration.')
        }

        let filteredTags = tags;
        if (noOverwrite) {
            console.log(`Skipping overwrite tags with the following pattern: ${noOverwrite}`);
            const remoteTags = await getTags(`${registry}/${imageName}`, username, password);
            const commonTags = tags.filter(tag => remoteTags.includes(tag));
            const excludedTags = commonTags.filter(tag => noOverwrite.test(tag));
            if (excludedTags.length > 0) {
                console.log(`Excluded tags: ${excludedTags}`);
            }
            filteredTags = tags.filter(tag => !excludedTags.includes(tag));
        }

        const images = filteredTags.map(tag => `${registry}/${imageName}:${tag}`);
        for (const image of images) {
            sh(`docker push ${image}`, {stdio: 'inherit'});
        }
    }
}

module.exports = new Docker();