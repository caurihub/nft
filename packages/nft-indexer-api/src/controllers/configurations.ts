import { Controller } from "@cauriland/core-api";
import { Container } from "@cauriland/core-kernel";
import latestVersion from "latest-version";

import { ConfigurationResource } from "../resources/configurations";

const packageName = require("../../package.json").name;
const currentVersion = require("../../package.json").version;

@Container.injectable()
export class ConfigurationController extends Controller {
	public async index(): Promise<any> {
		return this.respondWithResource(
			{
				packageName,
				currentVersion,
				latestVersion: await latestVersion(packageName),
			},
			ConfigurationResource,
		);
	}
}
