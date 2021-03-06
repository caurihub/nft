import { Container, Contracts } from "@cauriland/core-kernel";
import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { Enums } from "@caurihub/nft-base-crypto";

import { BurnsResource } from "../resources/burns";
import { BaseController } from "./base-controller";

@Container.injectable()
export class BurnsController extends BaseController {
	public async index(request: Hapi.Request) {
		const criteria: Contracts.Shared.TransactionCriteria = {
			...request.query,
			typeGroup: Enums.NFTBaseTransactionGroup,
			type: Enums.NFTBaseTransactionTypes.NFTBurn,
		};

		return this.paginateWithBlock(
			criteria,
			this.getListingOrder(request),
			this.getListingPage(request),
			request.query.transform,
			BurnsResource,
		);
	}

	public async show(request: Hapi.Request) {
		const transaction = await this.transactionHistoryService.findOneByCriteria({
			...request.query,
			typeGroup: Enums.NFTBaseTransactionGroup,
			type: Enums.NFTBaseTransactionTypes.NFTBurn,
			id: request.params.id,
		});
		if (!transaction) {
			return Boom.notFound("Burn Transaction not found");
		}
		return this.respondWithBlockResource(transaction, request.query.transform, BurnsResource);
	}
}
