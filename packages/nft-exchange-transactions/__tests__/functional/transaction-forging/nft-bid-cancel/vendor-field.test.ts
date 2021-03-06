import "@cauriland/core-test-framework/dist/matchers";

import { Contracts } from "@cauriland/core-kernel";
import { passphrases, snoozeForBlock } from "@cauriland/core-test-framework";
import { Utils } from "@cauriland/crypto";

import * as support from "../__support__";
import { NFTExchangeTransactionFactory } from "../__support__/transaction-factory";

let app: Contracts.Kernel.Application;
beforeAll(async () => (app = await support.setUp()));
afterAll(async () => await support.tearDown());

describe("NFT Bid Cancel functional tests - with VendorField", () => {
    it("should broadcast, accept and forge it [Signed with 1 Passphrase]", async () => {
        // Register collection
        const nftRegisteredCollection = NFTExchangeTransactionFactory.initialize(app)
            .NFTRegisterCollection({
                name: "Nascar Hero Cards",
                description: "Nascar Hero Cards collection",
                maximumSupply: 100,
                jsonSchema: {
                    type: "object",
                    additionalProperties: false,
                    required: ["ipfsHashImageFront", "issuedDate", "issuedLocation", "signed"],
                    properties: {
                        ipfsHashImageFront: {
                            type: "string",
                            maxLength: 120,
                            minLength: 1,
                        },
                        ipfsHashImageBack: {
                            type: "string",
                            maxLength: 120,
                            minLength: 1,
                        },
                        issuedDate: {
                            format: "date",
                        },
                        issuedLocation: {
                            type: "string",
                            maxLength: 255,
                            minLength: 1,
                        },
                        signed: {
                            type: "boolean",
                        },
                        tags: {
                            type: "array",
                            maxItems: 12,
                            minItems: 1,
                            additionalItems: false,
                            uniqueItems: true,
                            items: {
                                type: "string",
                            },
                        },
                    },
                },
            })
            .withVendorField("VendorField test -> [NFTRegisterCollection]")
            .withPassphrase(passphrases[0]!)
            .createOne();

        await expect(nftRegisteredCollection).toBeAccepted();
        await snoozeForBlock(1);
        await expect(nftRegisteredCollection.id).toBeForged();

        // Create token
        const nftCreate = NFTExchangeTransactionFactory.initialize(app)
            .NFTCreate({
                collectionId: nftRegisteredCollection.id!,
                attributes: {
                    ipfsHashImageFront: "QmavUFtLyRbUEEFLrmDTyRY5sLMh8UnQxWEenx2tuvzSE6",
                    ipfsHashImageBack: "QmdGCntrw9yabGJAU1nG3H38yQ2GLsphg3jwaxSGbXEj61",
                    issuedDate: "2020-09-25",
                    issuedLocation: "Mooresville , North Carolina",
                    signed: true,
                },
            })
            .withVendorField("VendorField test -> [NFTCreate]")
            .withPassphrase(passphrases[0]!)
            .createOne();

        await expect(nftCreate).toBeAccepted();
        await snoozeForBlock(1);
        await expect(nftCreate.id).toBeForged();

        // Create auction
        const nftAuction = NFTExchangeTransactionFactory.initialize(app)
            .NFTAuction({
                expiration: {
                    blockHeight: 30,
                },
                startAmount: Utils.BigNumber.make("1"),
                nftIds: [nftCreate.id!],
            })
            .withVendorField("VendorField test -> [NFTAuction]")
            .withPassphrase(passphrases[0]!)
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
            .withVendorField("VendorField test -> [NFTBid]")
            .withPassphrase(passphrases[1]!)
            .createOne();

        await expect(nftBid).toBeAccepted();
        await snoozeForBlock(1);
        await expect(nftBid.id).toBeForged();

        // Cancel bid
        const nftCancelBid = NFTExchangeTransactionFactory.initialize(app)
            .NFTBidCancel({
                bidId: nftBid.id!,
            })
            .withVendorField("VendorField test -> [NFTBidCancel]")
            .withPassphrase(passphrases[1]!)
            .createOne();

        await expect(nftCancelBid).toBeAccepted();
        await snoozeForBlock(1);
        await expect(nftCancelBid.id).toBeForged();
    });
});
