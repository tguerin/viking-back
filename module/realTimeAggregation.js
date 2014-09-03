var app = require('../app');
var io = require('socket.io')(app);
var mqtt = require('mqtt');
var uuid = require('node-uuid');

var client = mqtt.createClient(1883, 'ec2-54-186-153-191.us-west-2.compute.amazonaws.com');

var dataMap = {};

client.publish('source_sub', '{"id":"29f36f37-4ede-4edb-af0e-f7b74c144d5a","keywords":["android","ios","phonegap"]}');

io.on('connection', function (socket) {
  console.log('a user connected');
  socket.on('front-request', function (message) {
    var serverId = uuid.v4();
    dataMap[serverId] = {socket: socket, aggregation: {id: serverId, positive: 0, neutral: 0, negative: 0}};
    var messageToCollector = JSON.stringify({id: serverId, keywords: message.keywords});
    console.log(messageToCollector);
    client.publish('source_sub', messageToCollector);
    socket.emit('front-request', {clientId: message.clientId, serverId: serverId});
  });
});

client.subscribe('processed_data');

client.on('message', function (topic, message) {
  console.log(topic + ' ' + message);
  var tweetWithFeeling = JSON.parse(message);
  if (tweetWithFeeling.id in dataMap) {
    var data = dataMap[tweetWithFeeling.id];
    if (tweetWithFeeling.sentiment < 2) {
      data.aggregation.negative++;
    } else if (tweetWithFeeling.sentiment > 2) {
      data.aggregation.positive++;
    } else {
      data.aggregation.neutral++;
    }
    data.socket.emit('front-response', data.aggregation);
  }
});

io.listen(8888);