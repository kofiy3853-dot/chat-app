const { setupChatSockets } = require('./chatSockets');
const { setupCourseSockets } = require('./courseSockets');

const setupSockets = (io) => {
  setupChatSockets(io);
  setupCourseSockets(io);
};

module.exports = { setupSockets };
