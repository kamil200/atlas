import {
  DepartmentsListData,
  HealthData,
  InvestorsListData,
  InvestorsQuery,
  SuccessResponse,
} from "@atlas/schema";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { escapeLike } from "../modules/filters/compile-filters";
import { sendResponse } from "../utils/send-response";

/* Small lookup lists the filter panel needs, plus the health probe. */
const referenceRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "/departments",
    { schema: { response: { 200: SuccessResponse(DepartmentsListData) } } },
    async (_request, reply) => {
      const items = await app.prisma.department.findMany({ orderBy: { name: "asc" } });
      return sendResponse(reply, 200, { items });
    },
  );

  app.get(
    "/investors",
    {
      schema: {
        querystring: InvestorsQuery,
        response: { 200: SuccessResponse(InvestorsListData) },
      },
    },
    async (request, reply) => {
      const q = request.query.q?.trim();
      const items = await app.prisma.investor.findMany({
        where: q ? { name: { contains: escapeLike(q), mode: "insensitive" } } : undefined,
        orderBy: { name: "asc" },
        take: 50,
      });
      return sendResponse(reply, 200, { items });
    },
  );

  app.get(
    "/health",
    { schema: { response: { 200: SuccessResponse(HealthData) } } },
    async (_request, reply) => sendResponse(reply, 200, { status: "ok" as const }),
  );
};

export default referenceRoutes;
