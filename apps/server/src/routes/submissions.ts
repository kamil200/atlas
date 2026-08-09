import {
  ErrorResponse,
  SubmissionsListData,
  SubmitCompanyBody,
  SubmitCompanyData,
  SuccessResponse,
} from "@chowk/schema";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { sendResponse } from "../utils/send-response";
import { submissionInclude, toSubmissionDto } from "../utils/serializers";

const mutationRateLimit = { rateLimit: { max: 20, timeWindow: "1 minute" } };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const submissionRoutes: FastifyPluginAsyncTypebox = async (app) => {
  /*
    A submission is a real Company row from the moment it is created, marked
    PENDING, with a sidecar row holding who sent it and what the reviewer said.
    Approving flips one enum; nothing has to be copied between tables.
  */
  app.post(
    "/companies/submit",
    {
      onRequest: [app.authenticate],
      config: mutationRateLimit,
      schema: {
        body: SubmitCompanyBody,
        response: { 201: SuccessResponse(SubmitCompanyData), 401: ErrorResponse },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const slug = await uniqueSlug(app, slugify(body.name));

      // One HQ, always: whatever the form says, the first office is the head office.
      const offices = body.offices.map((office, index) => ({
        city: office.city.trim(),
        country: office.country.trim(),
        addressLine: office.addressLine?.trim() || null,
        lat: office.lat,
        lng: office.lng,
        isHq: body.offices.some((o) => o.isHq) ? office.isHq : index === 0,
      }));

      const company = await app.prisma.company.create({
        data: {
          slug,
          name: body.name.trim(),
          tagline: body.tagline?.trim() || null,
          description: body.description.trim(),
          website: body.website?.trim() || null,
          industries: body.industries,
          foundedYear: body.foundedYear ?? null,
          employeeCount: body.employeeCount ?? null,
          hiringStatus: body.hiringStatus,
          fundingStage: body.fundingStage ?? null,
          submissionStatus: "PENDING",
          offices: { create: offices },
          founders: {
            create: body.founders.map((founder) => ({
              title: founder.title.trim(),
              founder: {
                create: {
                  name: founder.name.trim(),
                  linkedinUrl: founder.linkedinUrl?.trim() || null,
                },
              },
            })),
          },
          submission: { create: { submittedById: request.user.sub } },
        },
        select: { id: true, submissionStatus: true },
      });

      return sendResponse(reply, 201, {
        companyId: company.id,
        submissionStatus: company.submissionStatus,
      });
    },
  );

  app.get(
    "/submissions/mine",
    {
      onRequest: [app.authenticate],
      schema: { response: { 200: SuccessResponse(SubmissionsListData), 401: ErrorResponse } },
    },
    async (request, reply) => {
      const items = await app.prisma.companySubmission.findMany({
        where: { submittedById: request.user.sub },
        include: submissionInclude,
        orderBy: { createdAt: "desc" },
      });

      return sendResponse(reply, 200, { items: items.map(toSubmissionDto) });
    },
  );
};

/* Two people can submit "Acme"; the second one becomes acme-2. */
async function uniqueSlug(
  app: Parameters<FastifyPluginAsyncTypebox>[0],
  base: string,
): Promise<string> {
  const candidate = base || "company";
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const slug = suffix === 0 ? candidate : `${candidate}-${suffix + 1}`;
    const taken = await app.prisma.company.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
  }
  // Fifty collisions on one name means something is wrong upstream.
  throw new Error(`Could not find a free slug for "${base}"`);
}

export default submissionRoutes;
