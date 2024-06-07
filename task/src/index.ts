import * as tl from 'azure-pipelines-task-lib';
import * as path from 'path';
import * as toolLib from 'azure-pipelines-tool-lib';
import * as utils from './utils';

var version = '';

async function installVals() {
  version = await utils.getValsVersion();
  var valsPath = await utils.downloadVals(version);
  // prepend the tools path. instructs the agent to prepend for future tasks
  if (!process.env['PATH'].startsWith(path.dirname(valsPath))) {
    toolLib.prependPath(path.dirname(valsPath));
  }
}

async function verifyVals() {
  console.log('Verifying vals installation...');
  tl.which('vals', true);
}

installVals()
  .then(() => verifyVals())
  .then(() => {
    tl.setResult(tl.TaskResult.Succeeded, '');
  })
  .catch(error => {
    tl.setResult(tl.TaskResult.Failed, error);
  });
