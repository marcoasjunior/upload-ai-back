import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma'
import { fastifyMultipart } from '@fastify/multipart'
import path from 'node:path';
import fs, { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { openai } from '../lib/openai';

export async function router(fastify: FastifyInstance) {
    fastify.register(fastifyMultipart, {
        limits: {
            fileSize: 1048576 * 50
        }
    })

    fastify.get('/prompts', async (request, reply) => {
        const prompts = await prisma.prompt.findMany();
        return prompts;
    });

    fastify.post('/videos', async (request, reply) => {
        const data = await request.file()
        if (!data) {
            return reply.status(400).send({ error: 'No file uploaded' })
        }

        const extension = path.extname(data.filename)
        if (extension !== '.mp3') {
            return reply.status(400).send({ error: 'Invalid file type' })
        }

        const fileBaseName = path.basename(data.filename, extension)
        const fileUploadName = `${fileBaseName}-${Date.now()}${extension}`
        const uploadPath = path.resolve(__dirname, '../../tmp', fileUploadName)

        await pipeline(data.file, fs.createWriteStream(uploadPath)) // ALTEREI DO ORIGINAL, ELE USOU COM O PROMISIFY

        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadPath,
            }
        })

        return { video }
    });

    fastify.post('/videos/:videoId/transcription', async (request, reply) => {

        const paramsSchema = z.object({
            videoId: z.string().uuid()
        })

        const { videoId } = paramsSchema.parse(request.params)

        const bodySchema = z.object({
            prompt: z.string(),
        })

        const { prompt } = bodySchema.parse(request.body)

        const video = await prisma.video.findUniqueOrThrow({
            where: {
                id: videoId
            }
        })

        const videoPath = video.path

        const audioReadStream = createReadStream(videoPath)

        const response = await openai.audio.transcriptions.create({
            file: audioReadStream,
            model: 'whisper-1',
            language: 'pt',
            response_format: 'json',
            temperature: 0,
            prompt

        })

        const transcription = response.text

        await prisma.video.update({
            where: {
                id: videoId
            },
            data: {
                transcription
            }
        })

        return { transcription }

    })

    fastify.post('/ai/complete', async (request, reply) => {
        const bodySchema = z.object({
            videoId: z.string().uuid(),
            template: z.string(),
            temperature: z.number().min(0).max(1).default(0.5),
        })

        const { videoId, template, temperature } = bodySchema.parse(request.body)

        return {
            videoId,
            template,
            temperature
        }

        

    })

}

