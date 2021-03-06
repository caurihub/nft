import { Schemas } from "@cauriland/core-api";
import Hapi from "@hapi/hapi";
import Joi from "joi";

import { AssetsController } from "../controllers/assets";

export const register = (server: Hapi.Server): void => {
	const controller = server.app.app.resolve(AssetsController);
	server.bind(controller);

	server.route({
		method: "GET",
		path: "/assets",
		handler: controller.index,
		options: {
			validate: {
				query: Joi.object({
					orderBy: server.app.schemas.orderBy,
					transform: Joi.bool().default(true),
				}).concat(Schemas.pagination),
			},
			plugins: {
				pagination: {
					enabled: true,
				},
			},
		},
	});

	server.route({
		method: "GET",
		path: "/assets/{id}",
		handler: controller.show,
		options: {
			validate: {
				query: Joi.object({
					transform: Joi.bool().default(true),
				}),
				params: Joi.object({
					id: Joi.string().hex().length(64),
				}),
			},
		},
	});

	server.route({
		method: "GET",
		path: "/assets/{id}/wallets",
		handler: controller.showAssetWallet,
		options: {
			validate: {
				params: Joi.object({
					id: Joi.string().hex().length(64),
				}),
			},
		},
	});

	server.route({
		method: "GET",
		path: "/assets/wallet/{id}",
		handler: controller.showWalletAssets,
		options: {
			validate: {
				query: Joi.object({
					orderBy: server.app.schemas.orderBy,
					transform: Joi.bool().default(true),
					inAuction: Joi.bool().default(false),
					inExpiredAuction: Joi.bool().default(false),
				}).concat(Schemas.pagination),
				params: Joi.object({
					id: Joi.string().hex().length(66),
				}),
			},
			plugins: {
				pagination: {
					enabled: true,
				},
			},
		},
	});

	server.route({
		method: "POST",
		path: "/assets/search",
		handler: controller.showByAsset,
		options: {
			validate: {
				query: Joi.object({
					orderBy: server.app.schemas.orderBy,
					transform: Joi.bool().default(true),
				}).concat(Schemas.pagination),
			},
			plugins: {
				pagination: {
					enabled: true,
				},
			},
		},
	});

	server.route({
		method: "POST",
		path: "/assets/claim",
		handler: async (request: Hapi.Request) => {
			const res = await controller.claimAsset(request);
			if (res.isBoom) return res;

			const route = server.table().find((route) => route.method === "post" && route.path === "/api/transactions");
			if (!route) return;

			return route.settings.handler({ payload: { transactions: [res] } });
		},
		options: {
			validate: {
				payload: Joi.object({
					collectionId: Joi.string().hex().length(64).required(),
					recipientId: Joi.string().alphanum().length(34).required(),
				}),
			},
		},
	});
};
