import fs from 'fs/promises';
import fastify from 'fastify';
import path from 'path';

const server = fastify({
  logger: true
});
const webroot = path.join(process.cwd(), 'public')

async function generateImportMap() {
  console.debug('import.meta.resolve(lit) =>', await import.meta.resolve('lit'));
  // console.debug('import.meta.resolve.paths(lit) =>', await import.meta.resolve.paths('lit'));
}

server.get('/', async (request, reply) => {
  const html = await fs.readFile(path.join(webroot, 'index.html'), 'utf-8')

  await generateImportMap();

  reply
    .type('text/html')
    .send(html)
})

server.listen(3000, (err, address) => {
  if (err) {
    server.log.error(err)
    process.exit(1)
  }

  server.log.info(`server listening on ${address}`)
})