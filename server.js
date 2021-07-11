const fs = require('fs').promises;
const fastify = require('fastify');
const path = require('path');

const server = fastify({
  logger: true
});
const webroot = path.join(process.cwd(), 'public')

function getPackageLocations() {
  console.debug('require.resolve(lit) =>', require.resolve('lit'));
  console.debug('require.resolve.paths(lit) =>', require.resolve.paths('lit'));
}

server.get('/', async (request, reply) => {
  const html = await fs.readFile(path.join(webroot, 'index.html'), 'utf-8')

  getPackageLocations();

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