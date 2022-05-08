import "@cauriland/core-test-framework/dist/matchers";

import { Contracts } from "@cauriland/core-kernel";
import { passphrases, snoozeForBlock } from "@cauriland/core-test-framework";

import * as support from "../__support__";
import { NFTBaseTransactionFactory } from "../__support__/transaction-factory";

let app: Contracts.Kernel.Application;

beforeAll(async () => {
    app = await support.setUp();
});

afterAll(async () => await support.tearDown());

describe("NFT Register collection functional tests - with VendorField", () => {
    it("should broadcast, accept and forge it [Signed with 1 Passphrase]", async () => {
        // Register collection
        const nftRegisteredCollection = NFTBaseTransactionFactory.initialize(app)
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
    });
});