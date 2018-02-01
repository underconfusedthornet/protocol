import test from 'ava';
import api from "../../../utils/lib/api";
import {deployContract} from "../../../utils/lib/contracts";
import deployEnvironment from "../../../utils/deploy/contracts";

const environmentConfig = require("../../../utils/config/environment.js");

const environment = "development";
const config = environmentConfig[environment];

let accounts;
let deployer;
let opts;
let governance;
let version;
let deployed;

test.before(async () => {
  deployed = await deployEnvironment(environment);
  accounts = await api.eth.accounts();
  [deployer] = accounts;
  opts = { from: deployer, gas: config.gas, gasPrice: config.gasPrice };
  version = deployed.Version;
  governance = await deployContract("system/Governance", opts, [[accounts[0]], 1, 100000]);
});

test.serial('Triggering a Version activates it within Governance', async t => {
  const [ , activeBeforeTriggering, ] = await governance.instance.getVersionById.call({}, [0]);
  await governance.instance.proposeVersion.postTransaction(opts, [version.address]);
  await governance.instance.approveVersion.postTransaction(opts, [version.address]);
  await governance.instance.triggerVersion.postTransaction(opts, [version.address]);
  const [ , activeAfterTriggering, ] = await governance.instance.getVersionById.call({}, [0]);

  t.false(activeBeforeTriggering);
  t.true(activeAfterTriggering);
});

test.serial('Governance can shut down Version', async t => {
  await governance.instance.proposeVersion.postTransaction(opts, [version.address]);
  await governance.instance.approveVersion.postTransaction(opts, [version.address]);
  await governance.instance.triggerVersion.postTransaction(opts, [version.address]);

  const [ , activeBeforeShutdown, ] = await governance.instance.getVersionById.call({}, [0]);

  await governance.instance.proposeShutdown.postTransaction(opts, [0]);
  await governance.instance.approveShutdown.postTransaction(opts, [0]);
  await governance.instance.triggerShutdown.postTransaction(opts, [0]);

  const versionShutDown = await version.instance.isShutDown.call({}, []);
  const [ , activeAfterShutdown, ] = await governance.instance.getVersionById.call({}, [0]);

  t.true(versionShutDown);
  t.true(activeBeforeShutdown);
  t.false(activeAfterShutdown);
});
