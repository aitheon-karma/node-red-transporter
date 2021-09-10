const { ServiceBroker } = require('moleculer');
const { readJsonSync, existsSync } = require('fs-extra');

module.exports = function (RED) {
  function GraphOutput(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const globalContext = node.context().global;
    const env = globalContext.get('env');
    const graphNodeId = env.GRAPH_NODE_ID;
    const broker = startBroker(globalContext);
    const graphNodeConfigPath = env.NODE_ENV === 'production' ? '/opt/app/graph-node.json' : `${env.PWD}/graph-node.json`;
    let graphNodeConfig = { connections: [ ]};
    if (existsSync(graphNodeConfigPath)){
       graphNodeConfig = readJsonSync(graphNodeConfigPath);
    }
    const name = `${node.id}.${node.name}`;
    const connections = graphNodeConfig.connections.filter((o) => o.source.output.name === name && o.source.graphNode === graphNodeId);

    // console.log('connections:', connections);

    node.on('input', (msg) => {
      connections.forEach((connection) => {
        const sendTo = connection.target.service ? connection.target.service : `GRAPH_NODE.${connection.target.graphNode}`;
        // console.log('sendTo', sendTo, msg, connection.target.input.name);
        // console.log('broker.emit:', broker.emit);
        broker.emit(connection.target.input.name, msg, sendTo);
      });
      node.send(msg);
    });

  }
  // console.log('registerType happened');
  RED.nodes.registerType('graph-output', GraphOutput);

  function GraphInput(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    var globalContext = this.context().global;
    var broker = startBroker(globalContext);

    var env = globalContext.get('env');
    var graphNodeId = env.GRAPH_NODE_ID;

    var serviceId = `GRAPH_NODE.${graphNodeId}`;
    var serviceName = node.id;
    var name = `${serviceId}.${serviceName}`;
    var functionName = `${serviceName}.${node.name}`;
    var events = {};

    events[functionName] = {
      name: functionName,
      group: serviceId,
      handler: (payload) => {
        node.send(payload);
      }
    }
    var service = {
      name,
      events
    };
    // Define a service
    broker.createService(service);

  }
  // console.log('registerType happened');
  RED.nodes.registerType('graph-input', GraphInput);



  function GraphSettingParam(config) {
    RED.nodes.createNode(this, config);
  }
  RED.nodes.registerType('graph-setting-param', GraphSettingParam);
}

function startBroker(context) {
  let broker = context.get('transporterBroker');
  const env = context.get('env');
  if (broker) {
    console.log('transporterBroker is already running');
    return broker;
  }
  const url = env.RABBITMQ_URI;
  const logLevel = env.NODE_ENV === 'production' ? 'error' : 'info';
  broker = new ServiceBroker({
    transporter: {
      type: 'AMQP',
      options: {
        url,
        prefetch: 1,
        autoDeleteQueues: 24 * 60 * 60 * 1000, // one day
      },
    },
    disableBalancer: true,
    logLevel
  });
  context.set('transporterBroker', broker);
  broker.start();
  return broker;
}

