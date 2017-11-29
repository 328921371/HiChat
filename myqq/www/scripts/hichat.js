window.onload = function() {
    //实例并初始化我们的hichat程序
    var hichat = new HiChat();
    hichat.init();
};

//定义我们的hichat类
var HiChat = function() {
    this.socket = null;
};

//向原型添加业务方法
HiChat.prototype = {
    init: function() {//此方法初始化程序
        var that = this;
        //建立到服务器的socket连接
        this.socket = io.connect();
        //监听socket的connect事件，此事件表示连接已经建立
        this.socket.on('connect', function() {
            //连接到服务器后，显示昵称输入框
            document.getElementById('info').textContent = '请输入你的名称 ';
            document.getElementById('nickWrapper').style.display = 'block';
            document.getElementById('nicknameInput').focus();
        });
        
        //昵称设置的确定按钮
		document.getElementById('loginBtn').addEventListener('click', function() {
		    var nickName = document.getElementById('nicknameInput').value;
		    //检查昵称输入框是否为空
		    if (nickName.trim().length != 0) {
		        //不为空，则发起一个login事件并将输入的昵称发送到服务器
		        that.socket.emit('login', nickName);
		    } else {
		        //否则输入框获得焦点
		        document.getElementById('nicknameInput').focus();
		    };
		}, false);
        
        //监听nickExisted事件,判断用户名是否重复
        this.socket.on('nickExisted', function() {
		    document.getElementById('info').textContent = '!nickname is taken, choose another pls'; //显示昵称被占用的提示
		});
		
		//监听loginSuccess事件,登录成功
		this.socket.on('loginSuccess', function() {
		    document.title = 'hichat | ' + document.getElementById('nicknameInput').value;
		    document.getElementById('loginWrapper').style.display = 'none';//隐藏遮罩层显聊天界面
		    document.getElementById('messageInput').focus();//让消息输入框获得焦点
		});
		
		this.socket.on('system', function(nickName, userCount, type) {
		    //判断用户是连接还是离开以显示不同的信息
		    var msg = nickName + (type == 'login' ? ' 登录' : ' 离开');
		 	//指定系统消息显示为红色
		    that._displayNewMsg('system ', msg, 'red');
		    //将在线人数显示到页面顶部
		    document.getElementById('status').textContent = userCount + ' 用户在线';
		});
		
		//监听用户发送消息
		document.getElementById('sendBtn').addEventListener('click', function() {
		    var messageInput = document.getElementById('messageInput'),
		        msg = messageInput.value;
		        //获取颜色值
        		color = document.getElementById('colorStyle').value;
		    messageInput.value = '';
		    messageInput.focus();
		    if (msg.trim().length != 0) {
		    	//显示和发送时带上颜色值参数
		        that.socket.emit('postMsg', msg, color); //把消息发送到服务器
		        that._displayNewMsg('me', msg, color); //把自己的消息显示到自己的窗口中
		    };
		}, false);
		
		//将监听到的消息显示出来
		this.socket.on('newMsg', function(user, msg, color) {
		    that._displayNewMsg(user, msg, color);
		});
		
		//将图片读取为base64格式的字符串形式进行发送。而base64格式的图片直接可以指定为图片的src，这样就可以将图片用img标签显示在页面了。
		document.getElementById('sendImage').addEventListener('change', function() {
	    //检查是否有文件被选中
		    if (this.files.length != 0) {
		        //获取文件并用FileReader进行读取
		        var file = this.files[0],
		             reader = new FileReader();
		        if (!reader) {
		            that._displayNewMsg('system', '!your browser doesn\'t support fileReader', 'red');
		            this.value = '';
		            return;
		        };
		        reader.onload = function(e) {
		            //读取成功，显示到页面并发送到服务器
		            this.value = '';
		            that.socket.emit('img', e.target.result);
		            that._displayImage('me', e.target.result);
		        };
		        reader.readAsDataURL(file);
		    };
		}, false);
		
		//监听返回回来的图片
		this.socket.on('newImg', function(user, img) {
		    that._displayImage(user, img);
		});
		
		//载入表情包
		this._initialEmoji();
		document.getElementById('emoji').addEventListener('click', function(e) {
		    var emojiwrapper = document.getElementById('emojiWrapper');
		    emojiwrapper.style.display = 'block';
		    e.stopPropagation();
		}, false);
		document.body.addEventListener('click', function(e) {
		    var emojiwrapper = document.getElementById('emojiWrapper');
		    if (e.target != emojiwrapper) {
		        emojiwrapper.style.display = 'none';
		    };
		});
		
		//监听哪个表情被点击了
		document.getElementById('emojiWrapper').addEventListener('click', function(e) {
		    //获取被点击的表情
		    var target = e.target;
		    if (target.nodeName.toLowerCase() == 'img') {
		        var messageInput = document.getElementById('messageInput');
		        messageInput.focus();
		        messageInput.value = messageInput.value + '[emoji:' + target.title + ']';
		    };
		}, false);
		
		//监听输入名称按钮,按回车
		document.getElementById('nicknameInput').addEventListener('keyup', function(e) {
		    if (e.keyCode == 13) {
		        var nickName = document.getElementById('nicknameInput').value;
		        if (nickName.trim().length != 0) {
		            that.socket.emit('login', nickName);
		        };
		    };
		}, false);
		
		//监听发送信息按钮,按回车
		document.getElementById('messageInput').addEventListener('keyup', function(e) {
		    var messageInput = document.getElementById('messageInput'),
		        msg = messageInput.value,
		        color = document.getElementById('colorStyle').value;
		    if (e.keyCode == 13 && msg.trim().length != 0) {
		        messageInput.value = '';
		        that.socket.emit('postMsg', msg, color);
		        that._displayNewMsg('me', msg, color);
		    };
		}, false);
		
		//清除聊天记录
		document.getElementById('clearBtn').addEventListener('click', function() {
            document.getElementById('historyMsg').innerHTML = '';
        }, false);
    },
    //创建聊天信息
    _displayNewMsg: function(user, msg, color) {
    	//获取聊天框
        var container = document.getElementById('historyMsg'),
        //创建聊天发送消息的标签
        msgToDisplay = document.createElement('p'),
        //创建时间
        date = new Date().toTimeString().substr(0, 8);
        //将消息中的表情转换为图片
        msg = this._showEmoji(msg);
        //字体颜色  
        msgToDisplay.style.color = color || '#000';
        //加入信息
        msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span>' + msg;
        //加入到聊天框中
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
    },
    //创建图片信息
    _displayImage: function(user, imgData, color) {
	    var container = document.getElementById('historyMsg'),
	        msgToDisplay = document.createElement('p'),
	        date = new Date().toTimeString().substr(0, 8);
	    msgToDisplay.style.color = color || '#000';
	    msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span> <br/>' + '<img src="' + imgData + '"/>';
	    container.appendChild(msgToDisplay);
	    container.scrollTop = container.scrollHeight;
	},
	//创建表情
	_initialEmoji: function() {
	    var emojiContainer = document.getElementById('emojiWrapper'),
	        docFragment = document.createDocumentFragment();
	    for (var i = 69; i > 0; i--) {
	        var emojiItem = document.createElement('img');
	        emojiItem.src = '../content/emoji/' + i + '.gif';
	        emojiItem.title = i;
	        docFragment.appendChild(emojiItem);
	    };
	    emojiContainer.appendChild(docFragment);
	},
	
	//判断消息文本中是否含有表情符号，如果有，则转换为图片，最后再显示到页面
	_showEmoji: function(msg) {//正则搜索其中的表情符号，将其替换为img标签，最后返回处理好的文本消息。
	    var match, result = msg,
	        reg = /\[emoji:\d+\]/g,
	        emojiIndex,
	        totalEmojiNum = document.getElementById('emojiWrapper').children.length;
	    while (match = reg.exec(msg)) {
	        emojiIndex = match[0].slice(7, -1);
	        if (emojiIndex > totalEmojiNum) {
	            result = result.replace(match[0], '[X]');
	        } else {
	            result = result.replace(match[0], '<img class="emoji" src="../content/emoji/' + emojiIndex + '.gif" />');
	        };
	    };
	    return result;
	}
};