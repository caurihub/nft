import "jest-extended";

import { Application, Container, Contracts } from "@cauriland/core-kernel";
import { Wallets } from "@cauriland/core-state";
import { passphrases } from "@cauriland/core-test-framework";
import { Handlers } from "@cauriland/core-transactions";
import { Identities, Interfaces, Transactions } from "@cauriland/crypto";
import { Builders as NFTBuilders, Enums, Interfaces as NFTInterfaces } from "@caurihub/nft-base-crypto";
import { Fifa } from "@caurihub/sets";

import {
    NFTBaseCollectionDoesNotExists,
    NFTBaseMaximumSupplyError,
    NFTBaseSchemaDoesNotMatch,
    NFTBaseSenderPublicKeyDoesNotExists,
    NFTMetadataDoesNotMatch,
} from "../../../src/errors";
import { NFTApplicationEvents } from "../../../src/events";
import { NFTRegisterCollectionHandler } from "../../../src/handlers";
import { INFTCollections, INFTTokens } from "../../../src/interfaces";
import { NFTIndexers } from "../../../src/wallet-indexes";
import { buildWallet, initApp, transactionHistoryService } from "../__support__/app";
import { collectionWalletCheck, deregisterTransactions } from "../utils/utils";

let app: Application;

let wallet: Contracts.State.Wallet;

let walletRepository: Wallets.WalletRepository;

let transactionHandlerRegistry: Handlers.Registry;

let nftCreateHandler: Handlers.TransactionHandler;

let actual: Interfaces.ITransaction;

const collectionId = "8527a891e224136950ff32ca212b45bc93f69fbb801c3b1ebedac52775f99e61";

beforeEach(async () => {
    app = initApp();

    walletRepository = app.get<Wallets.WalletRepository>(Container.Identifiers.WalletRepository);

    transactionHandlerRegistry = app.get<Handlers.Registry>(Container.Identifiers.TransactionHandlerRegistry);

    nftCreateHandler = transactionHandlerRegistry.getRegisteredHandlerByType(
        Transactions.InternalTransactionType.from(
            Enums.NFTBaseTransactionTypes.NFTCreate,
            Enums.NFTBaseTransactionGroup,
        ),
        2,
    );
    wallet = buildWallet(app, passphrases[0]!);
    walletRepository.index(wallet);

    const collectionsWallet = wallet.getAttribute<INFTCollections>("nft.base.collections", {});

    collectionsWallet[collectionId] = {
        currentSupply: 0,
        nftCollectionAsset: Fifa.collection,
    };

    const nftRegisterHandler = transactionHandlerRegistry.getRegisteredHandlerByType(
        Transactions.InternalTransactionType.from(
            Enums.NFTBaseTransactionTypes.NFTRegisterCollection,
            Enums.NFTBaseTransactionGroup,
        ),
        2,
    ) as unknown as NFTRegisterCollectionHandler;
    await nftRegisterHandler["compileAndPersistSchema"](collectionId, Fifa.collection.jsonSchema);

    wallet.setAttribute("nft.base.collections", collectionsWallet);

    walletRepository.getIndex(NFTIndexers.CollectionIndexer).set(collectionId, wallet);

    actual = new NFTBuilders.NFTCreateBuilder()
        .NFTCreateToken({
            collectionId,
            attributes: Fifa.assets.player1,
        })
        .nonce("1")
        .sign(passphrases[0]!)
        .build();
});

afterEach(() => {
    deregisterTransactions();
});

describe("NFT Create tests", () => {
    describe("bootstrap tests", () => {
        it("should test with the same wallet", async () => {
            transactionHistoryService.streamByCriteria.mockImplementationOnce(async function* () {
                yield actual.data;
            });

            await expect(nftCreateHandler.bootstrap()).toResolve();

            expect(wallet.getAttribute<INFTTokens>("nft.base.tokenIds")[actual.id!]).toBeObject();

            collectionWalletCheck(wallet, collectionId, 1, Fifa.collection);

            expect(walletRepository.findByIndex(NFTIndexers.NFTTokenIndexer, actual.id!)).toStrictEqual(wallet);
        });

        it("should test with different wallet", async () => {
            const secondWallet = buildWallet(app, passphrases[1]!);
            walletRepository.index(secondWallet);

            const actualTwo = new NFTBuilders.NFTCreateBuilder()
                .NFTCreateToken({
                    collectionId,
                    attributes: Fifa.assets.player1,
                })
                .nonce("1")
                .sign(passphrases[1]!)
                .build();

            transactionHistoryService.streamByCriteria.mockImplementationOnce(async function* () {
                yield actualTwo.data;
            });
            await expect(nftCreateHandler.bootstrap()).toResolve();

            collectionWalletCheck(wallet, collectionId, 1, Fifa.collection);

            expect(secondWallet.getAttribute<INFTTokens>("nft.base.tokenIds")[actualTwo.id!]).toBeObject();

            expect(walletRepository.findByIndex(NFTIndexers.NFTTokenIndexer, actualTwo.id!)).toStrictEqual(
                secondWallet,
            );
        });
    });

    describe("throwIfCannotBeApplied tests", () => {
        it("should not throw", async () => {
            await expect(nftCreateHandler.throwIfCannotBeApplied(actual, wallet)).toResolve();
        });

        it("should not throw if it is allowed issuer", async () => {
            const collectionsWallet = wallet.getAttribute<INFTCollections>("nft.base.collections", {});
            collectionsWallet[collectionId] = {
                currentSupply: 0,
                nftCollectionAsset: {
                    ...Fifa.collection,
                    allowedIssuers: [Identities.PublicKey.fromPassphrase(passphrases[0]!)],
                },
            };
            wallet.setAttribute("nft.base.collections", collectionsWallet);

            await expect(nftCreateHandler.throwIfCannotBeApplied(actual, wallet)).toResolve();
        });

        it("should throw if nftToken is undefined", async () => {
            const undefinedTokenInTransaction = { ...actual };
            undefinedTokenInTransaction.data.asset = undefined;

            await expect(nftCreateHandler.throwIfCannotBeApplied(undefinedTokenInTransaction, wallet)).toReject();
        });

        it("should throw NFTMaximumSupplyError", async () => {
            const collectionsWallet = wallet.getAttribute<INFTCollections>("nft.base.collections", {});
            collectionsWallet[collectionId] = {
                currentSupply: Fifa.collection.maximumSupply,
                nftCollectionAsset: Fifa.collection,
            };
            wallet.setAttribute("nft.base.collections", collectionsWallet);

            await expect(nftCreateHandler.throwIfCannotBeApplied(actual, wallet)).rejects.toThrowError(
                NFTBaseMaximumSupplyError,
            );
        });

        it("should throw NFTBaseCollectionDoesNotExists", async () => {
            const actual = new NFTBuilders.NFTCreateBuilder()
                .NFTCreateToken({
                    collectionId: "0f3bdaef56214296c191fc842adf50018f55dc6be04892dd92fb48874aabf8f5",
                    attributes: Fifa.assets.player1,
                })
                .nonce("1")
                .sign(passphrases[0]!)
                .build();

            await expect(nftCreateHandler.throwIfCannotBeApplied(actual, wallet)).rejects.toThrowError(
                NFTBaseCollectionDoesNotExists,
            );
        });

        it("should throw NFTSchemaDoesNotMatch if attributes does not match schema", async () => {
            const actual = new NFTBuilders.NFTCreateBuilder()
                .NFTCreateToken({
                    collectionId,
                    attributes: {
                        name: "a",
                    },
                })
                .nonce("1")
                .sign(passphrases[0]!)
                .build();

            await expect(nftCreateHandler.throwIfCannotBeApplied(actual, wallet)).rejects.toThrowError(
                NFTBaseSchemaDoesNotMatch,
            );
        });

        it("should throw NFTSchemaDoesNotMatch if no validate function in cache", async () => {
            const tokenSchemaValidatorCache = app.get<Contracts.Kernel.CacheStore<string, any>>(
                Container.Identifiers.CacheService,
            );
            await tokenSchemaValidatorCache.forget(collectionId);

            await expect(nftCreateHandler.throwIfCannotBeApplied(actual, wallet)).rejects.toThrowError(
                NFTBaseSchemaDoesNotMatch,
            );
        });

        it("should not throw NFTMetadataDoesNotMatch if metadata and attributes match", async () => {
            const collectionsWallet = wallet.getAttribute<INFTCollections>("nft.base.collections", {});
            collectionsWallet[collectionId]!.nftCollectionAsset = { ...Fifa.collection, metadata: Fifa.assets.player2 };
            wallet.setAttribute("nft.base.collections", collectionsWallet);

            const actual = new NFTBuilders.NFTCreateBuilder()
                .NFTCreateToken({
                    collectionId,
                    attributes: Fifa.assets.player2,
                })
                .nonce("1")
                .sign(passphrases[0]!)
                .build();

            await expect(nftCreateHandler.throwIfCannotBeApplied(actual, wallet)).toResolve();
        });

        it("should throw NFTMetadataDoesNotMatch if metadata and attributes does not match", async () => {
            const collectionsWallet = wallet.getAttribute<INFTCollections>("nft.base.collections", {});
            collectionsWallet[collectionId]!.nftCollectionAsset = { ...Fifa.collection, metadata: Fifa.assets.player1 };
            wallet.setAttribute("nft.base.collections", collectionsWallet);

            const actual = new NFTBuilders.NFTCreateBuilder()
                .NFTCreateToken({
                    collectionId,
                    attributes: {
                        name: "a",
                    },
                })
                .nonce("1")
                .sign(passphrases[0]!)
                .build();

            await expect(nftCreateHandler.throwIfCannotBeApplied(actual, wallet)).rejects.toThrowError(
                NFTMetadataDoesNotMatch,
            );
        });

        it("should throw NFTSenderPublicKeyDoesNotExists", async () => {
            const collectionsWallet = wallet.getAttribute<INFTCollections>("nft.base.collections", {});
            collectionsWallet[collectionId] = {
                currentSupply: 100,
                nftCollectionAsset: {
                    ...Fifa.collection,
                    allowedIssuers: [Identities.PublicKey.fromPassphrase(passphrases[1]!)],
                },
            };
            wallet.setAttribute("nft.base.collections", collectionsWallet);

            const actual = new NFTBuilders.NFTCreateBuilder()
                .NFTCreateToken({
                    collectionId,
                    attributes: Fifa.assets.player1,
                })
                .nonce("1")
                .sign(passphrases[0]!)
                .build();

            await expect(nftCreateHandler.throwIfCannotBeApplied(actual, wallet)).rejects.toThrowError(
                NFTBaseSenderPublicKeyDoesNotExists,
            );
        });
    });

    describe("emitEvents", () => {
        it("should test dispatch", async () => {
            const emitter: Contracts.Kernel.EventDispatcher = app.get<Contracts.Kernel.EventDispatcher>(
                Container.Identifiers.EventDispatcherService,
            );

            const spy = jest.spyOn(emitter, "dispatchSeq");

            await nftCreateHandler.emitEvents(actual, emitter);

            expect(spy).toHaveBeenCalledWith(NFTApplicationEvents.NFTCreate, expect.anything());
        });
    });

    describe("apply tests", () => {
        it("should apply correctly", async () => {
            await expect(nftCreateHandler.apply(actual)).toResolve();

            expect(wallet.getAttribute<INFTTokens>("nft.base.tokenIds")[actual.id!]).toBeObject();

            collectionWalletCheck(wallet, collectionId, 1, Fifa.collection);

            expect(walletRepository.findByIndex(NFTIndexers.NFTTokenIndexer, actual.id!)).toStrictEqual(wallet);
        });

        it("should apply correctly to recipient", async () => {
            const secondWallet = buildWallet(app, passphrases[1]!);
            walletRepository.index(secondWallet);

            const actualTwo = new NFTBuilders.NFTCreateBuilder()
                .NFTCreateToken({
                    collectionId,
                    attributes: Fifa.assets.player1,
                    recipientId: secondWallet.getAddress(),
                })
                .nonce("1")
                .sign(passphrases[0]!)
                .build();

            await expect(nftCreateHandler.apply(actualTwo)).toResolve();

            expect(secondWallet.getAttribute<INFTTokens>("nft.base.tokenIds")[actualTwo.id!]).toBeObject();
            collectionWalletCheck(wallet, collectionId, 1, Fifa.collection);
            expect(walletRepository.findByIndex(NFTIndexers.NFTTokenIndexer, actualTwo.id!)).toStrictEqual(
                secondWallet,
            );
        });
    });

    describe("revert tests", () => {
        it("should revert correctly", async () => {
            await nftCreateHandler.apply(actual);
            await expect(nftCreateHandler.revert(actual)).toResolve();

            expect(wallet.getAttribute<INFTTokens>("nft.base.tokenIds")[actual.id!]).toBeUndefined();

            collectionWalletCheck(wallet, collectionId, 0, Fifa.collection);

            expect(walletRepository.getIndex(NFTIndexers.NFTTokenIndexer).get(actual.id!)).toBeUndefined();
        });

        it("should revert correctly for recipient", async () => {
            const secondWallet = buildWallet(app, passphrases[1]!);
            walletRepository.index(secondWallet);

            const actualTwo = new NFTBuilders.NFTCreateBuilder()
                .NFTCreateToken({
                    collectionId,
                    attributes: Fifa.assets.player1,
                    recipientId: secondWallet.getAddress(),
                })
                .nonce("1")
                .sign(passphrases[0]!)
                .build();

            await nftCreateHandler.apply(actualTwo);
            await expect(nftCreateHandler.revert(actualTwo)).toResolve();

            expect(secondWallet.getAttribute<INFTTokens>("nft.base.tokenIds")[actualTwo.id!]).toBeUndefined();
            collectionWalletCheck(wallet, collectionId, 0, Fifa.collection);
            expect(walletRepository.getIndex(NFTIndexers.NFTTokenIndexer).get(actualTwo.id!)).toBeUndefined();
        });

        it("should throw if nftToken is undefined", async () => {
            await nftCreateHandler.apply(actual);
            actual.data.asset = undefined;
            await expect(nftCreateHandler.revert(actual)).toReject();
        });
    });
});
