import z from "zod";
import { randomUUID } from "crypto";
import { prisma } from "../../lig/prisma";
import { FastifyInstance } from "fastify";

export async function voteOnPoll(app: FastifyInstance) {
  app.post("/polls/:pollId/votes", async (request, reply) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid(),
    });

    const voteOnPollParams = z.object({
      pollId: z.string().uuid(),
    });

    const { pollId } = voteOnPollParams.parse(request.params);
    const { pollOptionId } = voteOnPollBody.parse(request.body);

    let { sessionId } = request.cookies;

    //verifica se o indece existe, caso não ele deixa votar.
    if (sessionId) {
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId,
          },
        },
      });

      if (
        userPreviousVoteOnPoll &&
        userPreviousVoteOnPoll.pollOptionId !== pollOptionId
      ) {
        //Apagar o voto anterio
        // Criar um novo

        await prisma.vote.delete({
          where: {
            id: userPreviousVoteOnPoll.id,
          },
        });
      } else if (userPreviousVoteOnPoll) {
        return reply
          .status(400)
          .send({ message: "You already voted on this poll." });
      }
    }

    //identificando usuario unicamente.
    if (!sessionId) {
      sessionId = randomUUID();

      reply.setCookie("sessionId", sessionId, {
        path: "/", //qual rota tem acesso - todas
        maxAge: 60 * 60 * 24 * 30, // 30 days
        signed: true, // não pode ser alterado pelo usuarios -
        httpOnly: true, // somente backend da applicação tem acesso as informações
      });
    }

    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId,
      },
    });

    return reply.status(201).send();
  });
}
