import { fastify } from 'fastify';
import { router } from './routes/router';

const app = fastify();

// add routes from router.ts

app.register(router);

app.listen({
    port: 3000,
}
).then(
    (address) =>
        console.log(`Server is running on ${address}`)
);