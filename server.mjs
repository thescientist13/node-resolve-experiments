import fs from 'fs/promises';
import fastify from 'fastify';
import path from 'path';

const server = fastify({
  logger: true
});
const webroot = path.join(process.cwd(), 'public')

async function getPackageLocations() {
  const dependencies = JSON.parse(await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')).dependencies;
  const dependencyMap = {};

  for (const dep of Object.keys(dependencies)) {
    // console.debug('import.meta.resolve =>', await import.meta.resolve(dependency));
    // console.debug('import.meta.resolve.paths =>', await import.meta.resolve.paths(dependency));
    dependencyMap[dep] = await import.meta.resolve(dep);
  }
  
  return dependencyMap;
}

server.get('/', async (request, reply) => {
  let html = await fs.readFile(path.join(webroot, 'index.html'), 'utf-8')
  const locations = await getPackageLocations();

  html = html.replace(/<h2><\/h2>/, `
    <h2>Location (ESM):</h2>
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