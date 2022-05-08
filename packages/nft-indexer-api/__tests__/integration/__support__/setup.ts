import { Utils as AppUtils } from "@cauriland/core-kernel";
import { Sandbox } from "@cauriland/core-test-framework";
import { Managers } from "@cauriland/crypto";
import { EventEmitter } from "events";

EventEmitter.prototype.constructor = Object.prototype.constructor;

const sandbox: Sandbox = new Sandbox();

export const setUp = async () => {
	jest.setTimeout(60000);

	process.env.CORE_RESET_DATABASE = "1";

	sandbox.withCoreOptions({
		flags: {
			token: "cauri",
			network: "unitnet",
			env: "test",
		},
		peers: {
			list: [{ ip: "127.0.0.1", port: 4000 }], // need some peers defined for the app to run
		},
		app: require("./app.json"),
	});
	await sandbox.boot(async ({ app }) => {
		await app.bootstrap({
			flags: {
				token: "cauri",
				network: "unitnet",
				env: "test",
				processType: "core",
			},
		});

		Managers.configManager.getMilestone().aip11 = false;
		Managers.configManager.getMilestone().htlcEnabled = false;

		await app.boot();

		Managers.configManager.getMilestone().aip11 = true;
		Managers.configManager.getMilestone().htlcEnabled = true;
		Managers.configManager.getMilestone().vendorFieldLength = 255;

		await AppUtils.sleep(1000); // give some more time for api server to be up
	});

	return sandbox.app;
};

export const tearDown = async () => sandbox.dispose();
