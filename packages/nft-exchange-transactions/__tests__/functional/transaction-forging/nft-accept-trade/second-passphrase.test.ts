import "@cauriland/core-test-framework/dist/matchers";

import { Contracts } from "@cauriland/core-kernel";
import { passphrases, snoozeForBlock, TransactionFactory } from "@cauriland/core-test-framework";
import { Identities, Utils } from "@cauriland/crypto";
import { generateMnemonic } from "bip39";

import * as support from "../__support__";
import { NFTExchangeTransactionFactory } from "../__support__/transaction-factory";

let app: Contracts.Kernel.Application;
beforeAll(async () => (app = await support.setUp()));
afterAll(async () => await support.tearDown());

describe("NFT Accept Trade functional tests - Signed with 2 Passphrases", () => {
    it("should broadcast, accept and forge it [Signed with 2 Passphrases]", async () => {
        // Register collection
        const nftRegisteredCollection = NFTExchangeTransactionFactory.initialize(app)
            .NFTRegisterCollection({
                name: "Nft card",
                description: "Nft card description",
                maximumSupply: 100,
                jsonSchema: {
                    properties: {
                        name: {
                            type: "string",
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
        const nftCreate = NFTExchangeTransactionFactory.initialize(app)
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

        // Create auction
        const nftAuction = NFTExchangeTransactionFactory.initialize(app)
            .NFTAuction({
                expiration: {
                    blockHeight: 70,
                },
                startAmount: Utils.BigNumber.make("1"),
                nftIds: [nftCreate.id!],
            })
            .withPassphrase(passphrase)
            .withSecondPassphrase(secondPassphrase)
            .createOne();

        await expect(nftAuction).toBeAccepted();
        await snoozeForBlock(1);
        await expect(nftAuction.id).toBeForged();

        // Create bid
        const nftBid = NFTExchangeTransactionFactory.initialize(app)
            .NFTBid({
                auctionId: nftAuction.id!,
                bidAmount: Utils.BigNumber.make("2"),
            })
            .withPassphrase(passphrases[2]!)
            .createOne();

        await expect(nftBid).toBeAccepted();
        await snoozeForBlock(1);
        await expect(nftBid.id).toBeForged();

        // AcceptTrade
        const nftAcceptTrade = NFTExchangeTransactionFactory.initialize(app)
            .NFTAcceptTrade({
                auctionId: nftAuction.id!,
                bidId: nftBid.id!,
            })
            .withPassphrase(passphrase)
            .withSecondPassphrase(secondPassphrase)
            .createOne();

        await expect(nftAcceptTrade).toBeAccepted();
        await snoozeForBlock(1);
        await expect(nftAcceptTrade.id).toBeForged();
    });
});
