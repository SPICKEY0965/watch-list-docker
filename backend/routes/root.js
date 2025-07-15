import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
    return c.json('watch-list-docker is running');
});

export default app;
