import "jest-extended";

import { Contracts } from "@cauriland/core-kernel";
import { Transactions } from "@cauriland/crypto";
import { Interfaces as NFTInterfaces, Transactions as NFTTransactions } from "@caurihub/nft-base-crypto";

import { INFTCollections } from "../../../src/interfaces";

export const collectionWalletCheck = (
    wallet: Contracts.State.Wallet,
    collectionId: string,
    currentSupply: number,
    nftCollectionAsset: NFTInterfaces.NFTCollectionAsset,
) => {
    expect(wallet.getAttribute<INFTCollections>("nft.base.collections")[collectionId]).toStrictEqual({
        currentSupply,
        nftCollectionAsset,
    });
};

export const deregisterTransactions = () => {
    Transactions.TransactionRegistry.deregisterTransactionType(NFTTransactions.NFTRegisterCollectionTransaction);
    Transactions.TransactionRegistry.deregisterTransactionType(NFTTransactions.NFTCreateTransaction);
    Transactions.TransactionRegistry.deregisterTransactionType(NFTTransactions.NFTBurnTransaction);
    Transactions.TransactionRegistry.deregisterTransactionType(NFTTransactions.NFTTransferTransaction);
};
