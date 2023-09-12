import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma'

export async function router(fastify: FastifyInstance) {
    fastify.get('/prompts', async (request, reply) => {
        const prompts = await prisma.prompt.findMany();
        return prompts;
    });

    fastify.get('/usuarios', async (request, reply) => {
        reply.send({ message: 'Rota de usuários' });
    });

}

