const { ServiceBroker } = require('moleculer');

var url = process.env.RABBITMQ_URI;
var logLevel = 'info';
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

var serviceId = `GRAPH_APP_NODE.123`;
var node = { name: 'mockOutput' };
var serviceName = 'MOCK_SERVICE';
var name = `${ serviceId }.${ serviceName }`;
var functionName = `${ serviceName }.${ node.name }`;
var events = {};

events[functionName] = {
  name: functionName,
  group: serviceId,
  handler: (payload) => {
    console.log('[handler]', payload);
  }
}
var service = {
  name,
  events
};
// Define a service
broker.createService(service);

broker.start();

setInterval(() => {
  console.log('Sending data', new Date());
  broker.emit('MyGraphService.testInput', { myCoolData: true, time: new Date() }, 'GRAPH_APP_NODE.5e81b7223b1ed3001498531f');
}, 10 * 1000);