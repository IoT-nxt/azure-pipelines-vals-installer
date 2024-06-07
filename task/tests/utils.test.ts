import { expect } from 'chai';
import * as utils from '../src/utils';
import * as tl from 'azure-pipelines-task-lib';
import * as semver from 'semver';
import * as path from 'path';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import * as sinon from 'sinon';

const tempDirectory = path.join(__dirname, 'temp');
const toolsDirectory = path.join(__dirname, 'tools');
const inputStub = sinon.stub(tl, 'getInput');

describe('vals util', () => {
  before(function () {
    if (!fs.existsSync(tempDirectory)) {
      fs.mkdirSync(tempDirectory);
    }

    if (!fs.existsSync(toolsDirectory)) {
      fs.mkdirSync(toolsDirectory);
    }

    tl.setVariable('agent.TempDirectory', tempDirectory);
    tl.setVariable('agent.ToolsDirectory', toolsDirectory);
  });
  after(function () {
    rimraf.rimrafSync(tempDirectory);
    rimraf.rimrafSync(toolsDirectory);
  });
  describe('#getValsVersion()', () => {
    it('should be able return semver when passing latest', async () => {
      inputStub.withArgs('valsVersionToInstall').returns('latest');
      const version = await utils.getValsVersion();
      expect(version).to.not.be.empty;
      expect(semver.major(version)).to.be.an('number');
      expect(semver.minor(version)).to.be.an('number');
      expect(semver.patch(version)).to.be.an('number');
    });
    it('should be able return semver when passing vx.x.x', async () => {
      inputStub.withArgs('valsVersionToInstall').returns('v0.139.9');
      const version = await utils.getValsVersion();
      expect(version).to.not.be.empty;
      expect(semver.major(version)).to.be.an('number');
      expect(semver.minor(version)).to.be.an('number');
      expect(semver.patch(version)).to.be.an('number');
    });
  });
  describe('#getVals()', () => {
    it('should be able resolve executable', async () => {
      const executable = await utils.getVals();
      expect(executable).to.not.be.empty;
      expect(fs.existsSync(executable)).true;
    });
  });
  describe('#downloadVals()', () => {
    it('should be able to download latest stable version', async () => {
      const executable = await utils.downloadVals();
      expect(executable).to.not.be.empty;
      expect(fs.existsSync(executable)).true;
    });
    it('should be able to download specific version', async () => {
      const executable = await utils.downloadVals('v0.139.8');
      expect(executable).to.not.be.empty;
      expect(fs.existsSync(executable)).true;
    });
  });
});
