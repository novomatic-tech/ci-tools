# ci-tools

This command line tool helps developers to create and publish artifacts in easy and automated way. 

## Prerequisites

* node.js 8+
* npm 5+
* git cli
* docker cli
* helm cli

## Installation

```bash
npm install ci-tools --save-dev
```

## Configuration

This cli requires the `package.json` file in the current working directory. There are three additional properties:

* `bundle.registry` - HTTP repository, where bundle will be pushed using a PUT request
* `docker.registry` - Docker repository, where images will be pushed
* `helmCharts.registry` - raw helm repository, where charts will be pushed

Sample snippet of the `package.json` file:
```json
{
  "name": "kibana",
  "version": "1.2.3-SNAPSHOT",
  "scripts": {
    "bundle-create": "ci-tools bundle-create .",
    "bundle-push": "ci-tools bundle-push",
    "docker-build": "ci-tools docker-build .",
    "docker-push": "ci-tools docker-push",
    "helm-charts-build": "ci-tools helm-charts-build --source ./charts",
    "helm-charts-push": "ci-tools helm-charts-push"
  },
  "bundle": {
    "registry": "https://some.nexus.example.com/repository/bundles"
  },
  "docker": {
    "registry": "registry.hub.docker.com"
  },
  "helmCharts": {
    "registry": "https://some.nexus.example.com/repository/helm/charts"
  }
}
```

## Versioning

A stable version is considered when it does not end with the `-SNAPSHOT` fragment. 
Therefore an unstable version is considered when it ends with the `-SNAPSHOT` fragment.

### Docker tags

A stable versions eg. `1.2.3` will create the following tags for docker image: `stable`, `latest`,`1.2.3`, `1.2`, `1`.

An unstable versions eg. `1.2.3-SNAPSHOT` will create the following tags for docker image: `unstable`, `1.2.3-SNAPSHOT`, `1.2.3-g0a51d42`, where `0a51d42` is a short commit hash.

### Helm charts version

An unstable versions eg. `1.2.3-SNAPSHOT` will create a chart with the following version: `1.2.3-g0a51d42`, where `0a51d42` is a short commit hash.

### Bundle version

The bundles are versioned in the same way as the version in the `package.json` file.

## Usage

### `ci-tools docker-build <path>`

Builds an image from a Dockerfile. Where `<path>` is a path where the `Dockerfile` file resides.
Additionally, two environment variable are accessible in the Dockerfile during build-time:

* `PKG_NAME` - the name property from the `package.json` file
* `PKG_VERSION` - the version property from the `package.json` file

**Options:**

* `-r, --registry [registry]` - The docker registry url
* `-n, --name [name]` - The docker image name (default: `pkg.name`)
* `-v, --version [version]` - The docker image version (default: `pkg.version`)
* `-t, --tag [tags]` - An image tags if different than in versioning convention
* `--build-arg [list]` - Sets additional build-time variables. Example: `--build-arg ARG1=foo --build-arg ARG2=bar`. (default: [])

### `ci-tools docker-push`

Pushes an image to a registry.

**Options:**

* `-r, --registry [registry]` - The docker registry url. (default: `pkg.docker.registry`)
* `-n, --name [name]` - The docker image name (default: `pkg.name`)
* `-v, --version [version]` - The docker image version (default: `pkg.version`)
* `-t, --tag [tags]` - An image tags if different than in versioning convention

### `ci-tools helm-charts-build`

Builds all charts from the specified directory, places them in the `./charts-output` directory and generates a repo index.

**Options:**

* `-s, --source [source]` - A directory with chart sources. It can either be a directory with a single Charts.yaml file or with subdirectories defining multiple charts (default: .)
* `-o, --output [output]` - A directory chart packages should be produced in (default: charts-output)
* `-v, --version [version]` - A chart version if different than set the version in `package.json` (default: `pkg.version`)
* `--appVersion [appVersion]` - An appVersion if different than set the version in `package.json` (default: `pkg.version`)


### `ci-tools helm-charts-push`

Pushes all charts from the `./charts-output` directory to a raw registry specified in the `package.json` file.

**Options:**

* `-c, --chartsDir [chartsDir]` - A directory containing built charts packages. Default: `charts-output`.
* `-r, --registry [registry]` - The helm charts registry url. (default: `pkg.helmCharts.registry`)
* `-u, --username [username]` - The username for the Helm charts registry.
* `-p, --password [password]` - The password for the Helm charts registry.

### `ci-tools bundle-create <path>`

Bundles a directory to zip archive. Where `<path>` is a path to directory that should be bundled. 
The bundle will be created in the current working directory with the following name: `[name]-[version].zip`.

**Options:**

* `-n, --name [name]` - The bundle name (default: `pkg.name`)
* `-s, --suffix [suffix]` - A suffix that will be added to bundle name. Default is a version form the `package.json` file. (default: `pkg.version`)
 
### `ci-tools bundle-push`

Pushes a bundle to a registry.

**Options:**

* `-n, --name [name]` - The bundle name (default: `pkg.name`)
* `-s, --suffix [suffix]` - A suffix that will be added to bundle name. Default is a version form the `package.json` file.
* `-u, --username [username]` - The username for the HTTP registry.
* `-p, --password [password]` - The password for the HTTP registry.
* `-r, --registry [registry]` - The HTTP registry url. (default: `pkg.bundle.registry`)
