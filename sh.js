const {exec} = require('child_process');

function sh(command, options = {returnStdout: true}) {
    console.log(`> ${command}`);

    return new Promise((resolve, reject) => {
        const child = exec(command);

        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
        child.stdin.pipe(process.stdin);

        child.on('error', (ex) => {
            reject(ex);
        });

        let result;
        if (options.returnStdout) {
            result = '';
            child.stdout.on('data', (chunk) => {
                result += chunk.toString();
            });
        }

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Unsuccessful status code: ${code}`));
            }
            resolve(result);
        });
    })
}

module.exports = sh;