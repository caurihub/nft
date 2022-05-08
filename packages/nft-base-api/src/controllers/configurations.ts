import { Controller } from "@cauriland/core-api";
import { Container } from "@cauriland/core-kernel";
import { Defaults as CryptoDefaults } from "@caurihub/nft-base-crypto";
import { Defaults as TransactionDefaults } from "@caurihub/nft-base-transactions";
import latestVersion from "latest-version";

import { ConfigurationResource } from "../resources/configurations";

const packageName = require("../../package.json").name;
const currentVersion = require("../../package.json").version;

@Container.injectable()
export class ConfigurationController extends Controller {
	public async index() {
		return this.respondWithResource(
			{
				packageName,
				currentVersion,
				latestVersion: await latestVersion(packageName),
				crypto: CryptoDefaults,
				transactions: TransactionDefaults,
			},
			ConfigurationResource,
		);
	}
}
