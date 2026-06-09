/**
 * Example boundary (SC-004): the example consumes Lyceum ONLY through its public
 * subpath exports — never the engine's source tree or dist internals.
 */
module.exports = {
  forbidden: [
    {
      name: 'example-no-engine-internals',
      severity: 'error',
      comment:
        'The example must import @lyceumjs/lms via its public subpaths only (US4 / SC-004).',
      from: { path: '^example' },
      to: { path: '(^|/)src/(core|runtime|fe|testing)/|@lyceumjs/lms/dist' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
  },
};
