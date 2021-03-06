import { Schemas } from "@cauriland/core-api";
import Hapi from "@hapi/hapi";
import Joi from "joi";

import { TransfersController } from "../controllers/transfers";

export const register = (server: Hapi.Server): void => {
	const controller = server.app.app.resolve(TransfersController);
	server.bind(controller);

	server.route({
		method: "GET",
		path: "/transfers",
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
		path: "/transfers/{id}",
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
};
