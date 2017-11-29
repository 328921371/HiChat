//服务器及页面响应部分
var express = require('express'),

    app = express(),
    
    server = require('http').createServer(app);
    
    io = require('socket.io').listen(server); //引入socket.io模块并绑定到服务器
    
    users=[];//保存所有在线用户的昵称
    
app.use('/', express.static(__dirname + '/www'));//指定静态HTML文件的位置


//socket部分
io.on('connection', function(socket) {
    //昵称设置,接受login的一个处理
    socket.on('login', function(nickname) {
        if (users.indexOf(nickname) > -1) {
            socket.emit('nickExisted'); //判断用户名是否存在,如果存在,则向自己发送一个nickExisted事件
        } else {
            socket.userIndex = users.length;
            socket.nickname = nickname;
            users.push(nickname);
            socket.emit('loginSuccess');
            io.sockets.emit('system', nickname, users.length, 'login'); //向所有连接到服务器的客户端发送当前登陆用户的昵称 
        };
    });
    
    //断开连接的事件
	socket.on('disconnect', function() {
	    //将断开连接的用户从users中删除
	    users.splice(socket.userIndex, 1);
	    //通知除自己以外的所有人
	    socket.broadcast.emit('system', socket.nickname, users.length, 'logout');
	});
	
	//接收新消息
    socket.on('postMsg', function(msg) {
        //将消息发送到除自己外的所有用户
        socket.broadcast.emit('newMsg', socket.nickname, msg);
    });
    
    //接收用户发来的图片
	socket.on('img', function(imgData) {
	    //通过一个newImg事件分发到除自己外的每个用户
	    socket.broadcast.emit('newImg', socket.nickname, imgData);
	});
	
});


/*需要解释一下的是，在connection事件的回调函数中，socket表示的是当前连接到服务器的那个客户端。
所以代码socket.emit('foo')则只有自己收得到这个事件，而socket.broadcast.emit('foo')则
表示向除自己外的所有人发送该事件，另外，上面代码中，io表示服务器整个socket连接，所以代码
io.sockets.emit('foo')表示所有人都可以收到该事件。*/

server.listen(process.env.PORT || 8080);
console.log('服务器开启成功')