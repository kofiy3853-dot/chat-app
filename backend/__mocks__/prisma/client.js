// Manual mock for prisma/client.js
// Jest resolves this instead of the real prisma/client.js when jest.mock('../../prisma/client') is called

const createChain = (defaultResult = null) => {
  const chain = {
    _result: defaultResult,

    findUnique: jest.fn().mockImplementation(() => chain),
    findFirst: jest.fn().mockImplementation(() => chain),
    findMany: jest.fn().mockImplementation(() => chain),
    create: jest.fn().mockImplementation(() => chain),
    update: jest.fn().mockImplementation(() => chain),
    updateMany: jest.fn().mockImplementation(() => chain),
    delete: jest.fn().mockImplementation(() => chain),
    deleteMany: jest.fn().mockImplementation(() => chain),
    upsert: jest.fn().mockImplementation(() => chain),
    count: jest.fn().mockResolvedValue(0),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),

    $queryRaw: jest.fn().mockResolvedValue([]),
    $join: jest.fn().mockImplementation((arr) => arr),
    $literal: jest.fn().mockImplementation((val) => val),
    $transaction: jest.fn().mockImplementation((fn) => {
      if (typeof fn === 'function') {
        const mockTx = createChain({});
        return fn(mockTx);
      }
      return Promise.all(fn);
    }),

    mockResolvedValue: (val) => {
      chain._result = val;
      ['findUnique', 'findFirst', 'findMany', 'create', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert'].forEach((method) => {
        chain[method].mockResolvedValue(val);
      });
      chain.count.mockResolvedValue(typeof val === 'number' ? val : 0);
      chain.createMany.mockResolvedValue({ count: Array.isArray(val) ? val.length : 0 });
      chain.$queryRaw.mockResolvedValue(Array.isArray(val) ? val : []);
      return chain;
    },

    then: (resolve, reject) => {
      return Promise.resolve(chain._result).then(resolve, reject);
    },
  };

  return chain;
};

const prisma = createChain();

// Model-specific sub-chains
const models = [
  'user', 'conversation', 'conversationParticipant', 'message', 'notification',
  'course', 'courseMembership', 'event', 'eventParticipant', 'announcement',
  'anonymousPost', 'assignment', 'submission', 'material', 'readReceipt', 'reaction',
];

models.forEach((model) => {
  prisma[model] = createChain([]);
});

module.exports = prisma;
