/**
 * dependency-cruiser — enforces the core import boundary (constitution Principle VII;
 * spec FR-002). `core` must stay pure: no runtime/fe, no H5P server lib, no db/http.
 */
module.exports = {
  forbidden: [
    {
      name: 'core-no-runtime-or-fe',
      comment: 'core/** must not import runtime/** or fe/**',
      severity: 'error',
      from: { path: '^src/core' },
      to: { path: '^src/(runtime|fe)' },
    },
    {
      name: 'core-no-h5p',
      comment: 'core/** must not import the H5P server/react libraries',
      severity: 'error',
      from: { path: '^src/core' },
      to: { path: 'node_modules/@lumieducation' },
    },
    {
      name: 'core-no-db-or-http',
      comment: 'core/** must not import any database or HTTP library',
      severity: 'error',
      from: { path: '^src/core' },
      to: {
        path:
          'node_modules/(pg|express|fastify|koa|@koa|mysql|mysql2|sqlite3|better-sqlite3|typeorm|prisma|@prisma|knex|sequelize|mongoose|mongodb|redis|ioredis|axios|node-fetch|got|undici)(/|$)',
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
  },
};
