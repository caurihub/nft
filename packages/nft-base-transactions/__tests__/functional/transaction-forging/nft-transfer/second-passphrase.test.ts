import "@cauriland/core-test-framework/dist/matchers";

import { Contracts } from "@cauriland/core-kernel";
import { passphrases, snoozeForBlock, TransactionFactory } from "@cauriland/core-test-framework";
import { Identities } from "@cauriland/crypto";
import { generateMnemonic } from "bip39";

import * as support from "../__support__";
import { NFTBaseTransactionFactory } from "../__support__/transaction-factory";

let app: Contracts.Kernel.Application;

beforeAll(async () => {
    app = await support.setUp();
});

afterAll(async () => await support.tearDown());

describe("NFT Transfer Functional Tests - Signed with 2 Passphrases", () => {
    it("should broadcast, accept and forge it [Signed with 2 Passphrases]", async () => {
        // Register collection
        const nftRegisteredCollection = NFTBaseTransactionFactory.initialize(app)
            .NFTRegisterCollection({
                name: "Nft card",
                description: "Nft card description",
                maximumSupply: 100,
                jsonSchema: {
                    properties: {
                        additionalProperties: false,
                        name: {
                            type: "string",
                            minLength: 3,
                        },
                        damage: {
                            type: "integer",
                        },
                        health: {
                            type: "integer",
                        },
                        mana: {
                            type: "integer",
                        },
                    },
                },
            })
            .withPassphrase(passphrases[0]!)
            .createOne();

        await expect(nftRegisteredCollection).toBeAccepted();
        await snoozeForBlock(1);
        await expect(nftRegisteredCollection.id).toBeForged();

        // Prepare a fresh wallet for the tests
        const passphrase = generateMnemonic();
        const secondPassphrase = generateMnemonic();

        // Initial Funds
        const initialFunds = TransactionFactory.initialize(app)
            .transfer(Identities.Address.fromPassphrase(passphrase), 150 * 1e8)
            .withPassphrase(passphrases[0]!)
            .createOne();

        await expect(initialFunds).toBeAccepted();
        await snoozeForBlock(1);
        await expect(initialFunds.id).toBeForged();

        // Register a second passphrase
        const secondSignature = TransactionFactory.initialize(app)
            .secondSignature(secondPassphrase)
            .withPassphrase(passphrase)
            .createOne();

        await expect(secondSignature).toBeAccepted();
        await snoozeForBlock(1);
        await expect(secondSignature.id).toBeForged();

        // Create Token
        const nftCreate = NFTBaseTransactionFactory.initialize(app)
            .NFTCreate({
                collectionId: nftRegisteredCollection.id!,
                attributes: {
                    name: "card name",
                    damage: 3,
                    health: 2,
                    mana: 2,
                },
            })
            .withPassphrase(passphrase)
            .withSecondPassphrase(secondPassphrase)
            .createOne();

        await expect(nftCreate).toBeAccepted();
        await snoozeForBlock(1);
        await expect(nftCreate.id).toBeForged();

        // Transfer
        const nftTransfer = NFTBaseTransactionFactory.initialize(app)
            .NFTTransfer({
                nftIds: [nftCreate.id!],
                recipientId: Identities.Address.fromPassphrase(passphrases[2]!),
            })
            .withPassphrase(passphrase)
            .withSecondPassphrase(secondPassphrase)
            .createOne();

        await expect(nftTransfer).toBeAccepted();
        await snoozeForBlock(1);
        await expect(nftTransfer.id).toBeForged();
    });
});
