import "jest-extended";

import { Application } from "@cauriland/core-kernel";
import { Generators } from "@cauriland/core-test-framework";
import { Managers, Transactions } from "@cauriland/crypto";
import { Defaults as CryptoDefaults, Transactions as NFTTransactions } from "@caurihub/nft-base-crypto";
import { Defaults as TransactionsDefaults } from "@caurihub/nft-base-transactions";
import latestVersion from "latest-version";

import { ConfigurationController } from "../../../src/controllers/configurations";
import { initApp, ItemResponse, transactionHistoryService } from "../__support__";

let app: Application;

let configurationsController: ConfigurationController;

beforeEach(() => {
	const config = Generators.generateCryptoConfigRaw();
	Managers.configManager.setConfig(config);

	app = initApp();

	transactionHistoryService.findManyByCriteria.mockReset();
	transactionHistoryService.findOneByCriteria.mockReset();
	transactionHistoryService.listByCriteria.mockReset();

	configurationsController = app.resolve<ConfigurationController>(ConfigurationController);
});

afterEach(() => {
	Transactions.TransactionRegistry.deregisterTransactionType(NFTTransactions.NFTRegisterCollectionTransaction);
	Transactions.TransactionRegistry.deregisterTransactionType(NFTTransactions.NFTCreateTransaction);
	Transactions.TransactionRegistry.deregisterTransactionType(NFTTransactions.NFTTransferTransaction);
	Transactions.TransactionRegistry.deregisterTransactionType(NFTTransactions.NFTBurnTransaction);
});

describe("Test configurations controller", () => {
	it("index - return package name and version and crypto and transactions default settings", async () => {
		const response = (await configurationsController.index()) as ItemResponse;
		expect(response.data).toStrictEqual({
			package: {
				name: require("../../../package.json").name,
				currentVersion: require("../../../package.json").version,
				latestVersion: await latestVersion(require("../../../package.json").name),
			},
			crypto: {
				...CryptoDefaults,
			},
			transactions: {
				...TransactionsDefaults,
			},
		});
	});
});
