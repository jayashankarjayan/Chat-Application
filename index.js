var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const notifier = require('node-notifier');

app.use('/static', express.static(__dirname + '/style.css'));

app.get('/', function(req, res) {

  res.sendFile(__dirname + '/index.html');
});

var active_users = [];
var active_user_unique_id = []
var messages_sent_by_users = []
var time_of_message_sent = []
var list_of_users_who_sent_messages = []
var list_of_unique_users = []

var add_active_users = function(username, id) {
  active_users.push(username);
  active_user_unique_id.push(id);
}

var get_active_users = function() {
  return active_users;
}

var get_active_users_unique_id = function() {
  return active_user_unique_id;
}

var disconnect_user = function(user_index) {
  active_users.pop(user_index);
  active_user_unique_id.pop(user_index);
}

var get_user_with_socket_id = function(id) {
  user_index =
    get_active_users_unique_id().indexOf(id);

  if (user_index >= 0) {
    user_name = get_active_users()[user_index];
  } else {
    user_name = "Anonymouse";
  }

  return user_name;
}

var is_an_active_user = function(id) {
  user_index =
    get_active_users_unique_id().indexOf(id);

  return user_index;
}

var set_messages_sent_by_user = function(id, message, timestamp) {
  list_of_users_who_sent_messages.push(get_user_with_socket_id(id));
  messages_sent_by_users.push(message);
  time_of_message_sent.push(timestamp);

}

var get_messages_sent_by_user = function() {

  message_array = []


  for (i = 0; i < messages_sent_by_users.length; i++) {
    sent_by = list_of_users_who_sent_messages[i];
    message = messages_sent_by_users[i];
    date_time = time_of_message_sent[i]
    message_array.push({
      sent_by: sent_by,
      message: message,
      time: date_time
    }, );
  }


  return JSON.stringify(message_array);
}

var set_list_of_unique_users = function(id) {
  user = get_user_with_socket_id(id);
  if (list_of_unique_users.length == 0) {
    list_of_unique_users.push(user);
  } else {
    for (i = 0; i < list_of_unique_users.length; i++) {
      if (list_of_unique_users[i] != user) {
        list_of_unique_users.push(user);
      }
    }
  }
}

var get_list_of_unique_users = function() {
  return list_of_unique_users
}
io.on('connection', function(socket) {
  // add_active_users(username, socket.id);

  socket.emit('initName', active_users);

  socket.on('user-joined', function(data){
    information = JSON.parse(data);
    username = information.user_name;

    add_active_users(username, socket.id);
    set_list_of_unique_users(socket.id);
    all_active_users = get_active_users_unique_id();
    var existing_users = [];
    for(i=0;i<all_active_users.length;i++)
    {
      if(all_active_users[i] != socket.id)
      {
        existing_users.push(get_user_with_socket_id(all_active_users[i]));
      }

      console.log(existing_users);

      io.emit("user-joined", existing_users);
    }
  });

  socket.on('chat message', function(data) {
    information = JSON.parse(data);
    message = information.msg;
    username = information.user_name;

    var currentdate = new Date();

    timestamp = currentdate.getDate() + "-" + (
        currentdate.getMonth() +
        1) + "-" + currentdate.getFullYear() + " @ " + currentdate.getHours() +
      ":" + currentdate.getMinutes();


    add_active_users(username, socket.id);
    set_list_of_unique_users(socket.id);
    set_messages_sent_by_user(
      socket.id, message, timestamp);

    return_data = '{"message": "' + message + '", "sent_by": "' +
      get_user_with_socket_id(socket.id) + '", "timestamp" : "' +
      timestamp + '"}';

    if (is_an_active_user(socket.id) >= 0) {
      io.emit('chat message', return_data);

      notifier.notify({
        'title': 'Bavardo',
        'message': message,
        'subtitle': message,
        'wait': true
      });

    }
  });

  socket.on("get-user-messages", function(data) {
    console.log("get-user-messages", get_messages_sent_by_user());
  });

  socket.on("get-users", function() {
    io.emit("get-users", get_list_of_unique_users());
  });

  socket.on('disconnect', function(data) {
    user_index =
      get_active_users_unique_id().indexOf(socket.id);

    console.log('User ' + get_user_with_socket_id(socket.id) +
      ' has disconnected');

    socket.broadcast.emit('newclientconnect', {
      description: get_user_with_socket_id(socket.id) +
        " has disconnected"
    })
    disconnect_user(user_index);
    user_log_out_message =
      'You have been disconnected from the server.';
    io.emit('disconnect', user_log_out_message);

  });
  socket.broadcast.emit('newclientconnect', {
    description: "A new user has joined"
  })
  console.log('a user connected');
});

http.listen(3000, function() {
  console.log('listening on *:3000');
});
