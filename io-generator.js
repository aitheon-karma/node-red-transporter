
const mongoose = require('mongoose');
const fs = require('fs-extra');

const dbUri = process.env.MONGODB_URI;
const buildId = process.env.BUILD_ID;

const options = {
  reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
  reconnectInterval: 500, // Reconnect every 500ms
  poolSize: 10, // Maintain up to 10 socket connections
  bufferMaxEntries: 0,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

let connection;
try {
  connection = mongoose.createConnection(dbUri, options);
  connection.once('open', () => {
    console.log('[DB] MongoDB opened');
    connection.on('disconnected', () => {
      console.log('[DB] disconnected');
    });
    connection.on('reconnected', () => {
      console.log('[DB] reconnected');
    });
    connection.on('error', (err) => {
      console.log('[DB] event error: ' + err);
    });
  });
} catch (err) {
  console.log('[DB] MongoDB connection error. Please make sure MongoDB is running.', err);
  process.exit(0);
}
const BuildsSchema = connection.collection('build_server__builds');

const flowsPath = `${ process.env.PWD }/flows.json`;
console.log('flowsPath: ', flowsPath);
const flows = fs.readJSONSync(flowsPath);
const mapping = (flowNode) => {
  return {
    name: `${ flowNode.id }.${ flowNode.name }`,
    socket: flowNode.socketId
  }
}
const inputsNode = flows.filter((f) => f.type == "graph-input").map(mapping);
const outputsNode = flows.filter((f) => f.type == "graph-output").map(mapping);
const settingParams = flows.filter((f) => f.type == "graph-setting-param").map((flowNode) => {
  return {
    name: `${ flowNode.id }.${ flowNode.name }`,
    default: flowNode.defaultValue || ''
  }
});


const serviceIO = {
  inputsNode,
  outputsNode,
  inputsService: [],
  outputsService: [],
  events: [],
  actions: [],
  ticks: [],
  settingParams: settingParams || []
};

BuildsSchema.updateOne({ _id: mongoose.Types.ObjectId(buildId) }, { $set: { transporter: serviceIO } }, (result) => {
  console.log('Graph App IO saved', result);
  process.exit(0);
});