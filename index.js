'use strict';

const unzip = require('unzip2');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const spawnSync = require('child_process').spawnSync;
const Bluebird = require('bluebird');
const glob = require('glob-all');
const rimraf = require('rimraf');
const _ = require('lodash');

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      'after:deploy:createDeploymentArtifacts': this.transform.bind(this),
    };
  }

  transform() {
    return new Bluebird((resolve, reject) => {
      const servicePath = this.serverless.config.servicePath;

      // unzip
      const stream = fs.createReadStream(path.join(servicePath, `.serverless/${this.serverless.service.service}.zip`))
        .pipe(unzip.Extract({ path: path.join(servicePath, '.serverless/tmpCoffeeDirectory') }));

      stream.on('error', (error) => {
        reject(error);
      });

      stream.on('finish', () => {
        // compile
        const args = [
          '--compile',
          'tmpCoffeeDirectory'
        ];
        const options = {
          cwd: path.join(servicePath, '.serverless'),
        };
        var pathToCoffee = path.join(__dirname, '..', '.bin/coffee');
        if (!fs.existsSync(pathToCoffee))
          pathToCoffee = 'coffee'
        const result = spawnSync(pathToCoffee, args, options);
        const sterr = result.stderr.toString();
        if (sterr) {
          reject(sterr);
        }

        // zip
        this.serverless.cli.log('Packaging service with compiled files...');
        const patterns = ['**'];
        const tmpCoffeeDirectory = '.serverless/tmpCoffeeDirectory';
        const zip = archiver.create('zip');

        const artifactFilePath = `.serverless/${this.serverless.service.service}.zip`;
        this.serverless.utils.writeFileDir(artifactFilePath);

        const output = fs.createWriteStream(artifactFilePath);

        output.on('open', () => {
          zip.pipe(output);

          const files = glob.sync(patterns, {
            cwd: tmpCoffeeDirectory,
            dot: true,
            silent: true,
            follow: true,
          });

          files.forEach((filePath) => {
            const fullPath = path.resolve(tmpCoffeeDirectory, filePath);

            const stats = fs.statSync(fullPath);

            if (!stats.isDirectory(fullPath)) {
              zip.append(fs.readFileSync(fullPath), {
                name: filePath,
                mode: stats.mode,
              });
            }
          });

          zip.finalize();
        });

        zip.on('error', err => reject(err));

        output.on('close', () => {
          try {
            rimraf.sync(tmpCoffeeDirectory, { disableGlob: true });
          } catch (err) {
            reject(err);
          }
          resolve(artifactFilePath);
        });
      });
    });
  }
}

module.exports = ServerlessPlugin;
