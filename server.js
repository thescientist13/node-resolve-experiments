const fs = require('fs').promises;
const fastify = require('fastify');
const path = require('path');

const server = fastify({
  logger: true
});
const webroot = path.join(process.cwd(), 'public')

function getPackageLocations() {
  const dependencies = require(path.join(process.cwd(), 'package.json')).dependencies;
  const dependencyMap = {};

  for (const dep of Object.keys(dependencies)) {
    console.debug('require.resolve =>', require.resolve(dep));
    // console.debug('require.resolve.paths =>', require.resolve.paths(dep));

    dependencyMap[dep] = require.resolve(dep);
  }
  
  return dependencyMap;
}

server.get('/', async (request, reply) => {
  let html = await fs.readFile(path.join(webroot, 'index.html'), 'utf-8')
  const locations = getPackageLocations();

  html = html.replace(/<h2><\/h2>/, `
    <h2>Location (CJS):</h2>
      <pre>
        ${JSON.stringify(locations, null, 2)}
      </pre>
    </h2>
  `);

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