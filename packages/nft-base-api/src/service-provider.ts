import { Identifiers, Server } from "@cauriland/core-api";
import { Container, Contracts, Providers } from "@cauriland/core-kernel";

import Handlers from "./handlers";

const plugin = require("../package.json");

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const logger: Contracts.Kernel.Logger = this.app.get(Container.Identifiers.LogService);
		logger.info(`Loading plugin: ${plugin.name} with version ${plugin.version}.`);

		for (const identifier of [Identifiers.HTTP, Identifiers.HTTPS]) {
			if (this.app.isBound<Server>(identifier)) {
				await this.app.get<Server>(identifier).register({
					plugin: Handlers,
					routes: { prefix: "/api/nft" },
				});
			}
		}
	}
}
