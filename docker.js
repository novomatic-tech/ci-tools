const {sh} = require('./utils');

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

    push({registry, imageName, tags = []}) {
        if (!imageName) {
            throw new Error('Missing image name.')
        }
        if (!registry) {
            throw new Error('Missing registry url configuration.')
        }

        const images = tags.map(tag => `${registry}/${imageName}:${tag}`);
        for (const image of images) {
            sh(`docker push ${image}`, {stdio: 'inherit'});
        }
    }
}

module.exports = new Docker();