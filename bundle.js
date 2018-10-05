const fs = require('fs');
const archiver = require('archiver');
const http = require('http');
const https = require('https');
const url = require('url');

class Bundle {

    async create({path, output}) {
        if (!path) {
            throw new Error('Missing path.')
        }

        if (!output) {
            throw new Error('Missing output.')
        }

        const archive = archiver('zip', {zlib: {level: 9}});
        const writeStream = fs.createWriteStream(output);

        console.log(`Creating the bundle in the following path: ${output}.`);

        await new Promise((resolve, reject) => {
            archive
                .directory(path, false)
                .on('error', error => reject(error))
                .pipe(writeStream);

            writeStream.on('error', (error) => {
                reject(new Error(`An error occurred while creating a write stream. ${error}`));
            });

            writeStream.on('close', () => {
                console.log(archive.pointer() + ' bytes were archived');
                resolve();
            });
            archive.finalize();
        });
    }


    async push({path, destinationUrl, username, password}) {

        if (!path) {
            throw new Error('Missing path.')
        }

        if (!destinationUrl) {
            throw new Error('Missing destination URL.')
        }

        const headers = {
            'Content-Type': 'application/zip'
        };

        if (username && password) {
            headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
        }

        const resourceUrl = url.parse(destinationUrl);

        console.log(`Pushing the bundle to the registry url: ${resourceUrl.href}.`);

        await new Promise((resolve, reject) => {
            const request = resourceUrl.protocol === 'https:' ? https.request : http.request;

            const putRequest = request({
                protocol: resourceUrl.protocol,
                hostname: resourceUrl.hostname,
                port: resourceUrl.port,
                path: resourceUrl.path,
                method: 'PUT',
                headers
            }, (response) => {
                if (response.statusCode >= 400) {
                    reject(new Error(`The request has been completed with unsuccessful status code. Code: ${response.statusCode}`));
                } else {
                    console.log('The bundle has been successfully pushed.');
                    resolve();
                }
            });

            putRequest.on('error', (error) => {
                reject(new Error(`An error occurred while creating a request. ${error}`));
            });

            const readStream = fs.createReadStream(path);
            readStream.on('error', (error) => {
                reject(new Error(`An error occurred while creating a read stream. ${error}`));
            });
            readStream.pipe(putRequest);
        });
    }
}

module.exports = new Bundle();