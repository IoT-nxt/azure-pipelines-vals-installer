import * as path from 'path';
import * as fs from 'fs';
import * as toolLib from 'azure-pipelines-tool-lib';
import * as os from 'os';
import * as util from 'util';
import { v4 as uuidv4 } from 'uuid';
import * as tl from 'azure-pipelines-task-lib';
import * as semver from 'semver';

const valsToolName = 'vals';
const valsAllReleasesUrl = 'https://api.github.com/repos/helmfile/vals/releases';
const stableValsVersion = 'v0.37.2';

function getExecutableExtension(): string {
  if (os.type().match(/^Win/)) {
    return '.exe';
  }

  return '';
}

function getSupportedLinuxArchitecture(): string {
  let supportedArchitecture = 'amd64';
  const architecture = os.arch();
  if (architecture.startsWith('arm')) {
    //both arm64 and arm are handled
    supportedArchitecture = architecture;
  }
  return supportedArchitecture;
}

function findVals(rootFolder: string) {
  const helmPath = path.join(rootFolder, `${valsToolName}${getExecutableExtension()}`);
  const allPaths = tl.find(rootFolder);
  const matchingResultsFiles = tl.match(allPaths, helmPath, rootFolder);
  return matchingResultsFiles[0];
}

function getValsDownloadURL(version: string): string {
  switch (os.type()) {
    case 'Linux':
      const architecture = getSupportedLinuxArchitecture();
      return util.format(
        'https://github.com/helmfile/vals/releases/download/%s/vals_%s_linux_%s.tar.gz',
        version,
        semver.clean(version),
        architecture
      );

    case 'Darwin':
      return util.format(
        'https://github.com/helmfile/vals/releases/download/%s/vals_%s_darwin_amd64.tar.gz',
        version,
        semver.clean(version)
      );

    case 'Windows_NT':
      return util.format(
        'https://github.com/helmfile/vals/releases/download/%s/vals_%s_windows_amd64.tar.gz',
        version,
        semver.clean(version)
      );

    default:
      throw Error('Unknown OS type');
  }
}

async function getStableValsVersion(): Promise<string> {
  try {
    const downloadPath = await toolLib.downloadTool(valsAllReleasesUrl);
    const responseArray = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
    let latestValsVersion = semver.clean(stableValsVersion);
    responseArray.forEach((response: { tag_name: string }) => {
      if (response && response.tag_name) {
        let currentValsVersion = semver.clean(response.tag_name.toString());
        if (currentValsVersion) {
          if (currentValsVersion.toString().indexOf('rc') == -1 && semver.gt(currentValsVersion, latestValsVersion!)) {
            //If current vals version is not a pre release and is greater than latest vals version
            latestValsVersion = currentValsVersion;
          }
        }
      }
    });
    latestValsVersion = 'v' + latestValsVersion;
    return latestValsVersion;
  } catch (error) {
    let telemetry = {
      event: 'HelmLatestNotKnown',
      url: valsAllReleasesUrl,
      error: error
    };
    console.log('##vso[telemetry.publish area=%s;feature=%s]%s', 'TaskEndpointId', 'valsInstaller', JSON.stringify(telemetry));

    tl.warning(`Unable to determine latest vals version at URL ${valsAllReleasesUrl}. Using default version ${stableValsVersion}.`);
  }

  return stableValsVersion;
}

function sanitizeVersionString(inputVersion: string): string {
  var version = toolLib.cleanVersion(inputVersion);
  if (!version) {
    throw new Error(`'${inputVersion}' is not a valid version string.`);
  }

  return 'v' + version;
}

export async function getVals(version?: string) {
  try {
    return Promise.resolve(tl.which('vals', true));
  } catch (ex) {
    return downloadVals(version);
  }
}

export async function downloadVals(version?: string): Promise<string> {
  if (!version) {
    version = await getStableValsVersion();
  }
  let cachedToolpath = toolLib.findLocalTool(valsToolName, version);
  if (!cachedToolpath) {
    let valsExtractDir: string;
    const downloadUrl = getValsDownloadURL(version);
    try {
      const tempDirectory = `${valsToolName}-${version}-${uuidv4()}`;
      let valsDownloadPath = await toolLib.downloadTool(downloadUrl, path.join(tempDirectory, valsToolName));
      valsExtractDir = await toolLib.extractTar(valsDownloadPath, path.join(tempDirectory, 'extracted', valsToolName));
    } catch (exception) {
      throw new Error(`Failed to download vals at URL ${downloadUrl}. Exception: ${exception}`);
    }
    cachedToolpath = await toolLib.cacheDir(valsExtractDir, valsToolName, version);
  }
  const valspath = findVals(cachedToolpath);
  if (!valspath) {
    throw new Error(`Unable to find cached vals at path ${cachedToolpath}.`);
  }

  fs.chmodSync(valspath, '777');
  return valspath;
}

export async function getValsVersion(): Promise<string> {
  let valsVersion = tl.getInput('valsVersionToInstall');
  if (valsVersion && valsVersion != 'latest') {
    return sanitizeVersionString(valsVersion);
  }

  return await getStableValsVersion();
}
