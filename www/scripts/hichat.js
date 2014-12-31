var roomId = -1;
var hichat;
window.onload = function() {
    hichat = new HiChat();
    hichat.init();
};
var HiChat = function() {
    this.socket = null;
    this.nums = 0;
    this.ids = -1;
};
HiChat.prototype = {
    init: function() {
        var that = this;
        this.socket = io.connect();
        this.socket.on('connect', function() {
            document.getElementById('info').textContent = 'get yourself a nickname :)';
            document.getElementById('nickWrapper').style.display = 'block';
            document.getElementById('nicknameInput').focus();
            
            var emojiContainer = document.getElementById('emojiWrapper'),
            docFragment = document.createDocumentFragment();
            for (var i = 69; i > 0; i--) {
            var emojiItem = document.createElement('img');
            emojiItem.src = '../content/emoji/' + i + '.gif';
            emojiItem.title = i;
            docFragment.appendChild(emojiItem);
            };
            emojiContainer.appendChild(docFragment);
        });
        this.socket.on('nickExisted', function() {
            document.getElementById('info').textContent = '!nickname is taken, choose another pls';
        });
        this.socket.on('alreadyIn', function() {
            document.getElementById('info').textContent = '已经打开另一个网页';
        });
		this.socket.on('nickUnExisted', function() {
            alert('用户信息错误,提交选择失败');
        });
		this.socket.on('alreadySelected', function() {
            alert('你这轮已经选择过啦!');
        });
		this.socket.on('waitBefore', function() {
            alert('前面的用户还没选择,请排队!');
        });
        this.socket.on('initRooms', function(roomsHtml) {
            document.getElementById('rooms').innerHTML = roomsHtml;
        });
        this.socket.on('loginSuccess', function() {
            document.title = 'chat | ' + document.getElementById('nicknameInput').value;
            document.getElementById('loginWrapper').style.display = 'none';
            document.getElementById('messageInput').focus();
        });
        this.socket.on('error', function(err) {
            if (document.getElementById('loginWrapper').style.display == 'none') {
                document.getElementById('status').textContent = '!fail to connect :(';
            } else {
                document.getElementById('info').textContent = '!fail to connect :(';
            }
        });
        this.socket.on('system', function(nickName, userCount, type) {
            var msg = nickName + (type == 'login' ? ' joined' : ' left');
            that._displayNewMsg('system', msg, 'red');
            document.getElementById('status').textContent = userCount + (userCount > 1 ? ' users' : ' user') + ' joined';
        });
        this.socket.on('newMsg', function(user, msg, color) {
            that._displayNewMsg(user, msg, color);
        });
        this.socket.on('newImg', function(user, img, color) {
            that._displayImage(user, img, color);
        });
        this.socket.on('succ', function(rId,num,mNum,sNum) {
            that._displayRoomSuc(rId,num,mNum,sNum);
            
        });
        this.socket.on('eroo', function(rId,mNum,sNum) {
            that._displayRoomEro(rId,mNum,sNum);
        });
        this.socket.on('roomStatus', function(codes,mNum,type,wnum) {
            that._displayResult(codes,"--",mNum);
            if(type == 1){
                document.getElementById('status').textContent = document.getElementById('status').textContent+"----你已经参与过，你是第"+wnum+"位参与者";
            }else{
                 if(wnum>0){
                     document.getElementById('status').textContent = document.getElementById('status').textContent+"----请耐心等候，你前面还有"+wnum+"位参与者未选择";  
                 }else{
                    document.getElementById('status').textContent = document.getElementById('status').textContent+"----轮到你啦，请在10秒内做出选择";  
                 }
            }
        });
        this.socket.on('playerIn', function(rId,weizhi) {
            that._playerIn(rId,weizhi);
        });
        this.socket.on('playerOut', function(rId,weizhi) {
            that._playerOut(rId,weizhi);
        });
        this.socket.on('suc', function(codes) {
            that._displayResult(codes,"--",that.nums);
			var rs = "<ul>";
			for(var i=0;i<codes.length;i++){
				rs += "<li class='ans_yes'>"+codes[i]+"</li>";
			}
            for(var i=codes.length;i<that.nums;i++){
                rs += "<li class='ans_wait'></li>";
            }
			rs += "</ul>";
            document.getElementById('okNum').innerHTML = codes.length;
            document.getElementById('gameResult').innerHTML = rs;
        });
        this.socket.on('ero', function(codes, CODE) {
            that._displayResult(codes, CODE, that.nums);
			var rs = "<ul>";
			for(var i=0;i<codes.length-1;i++){
				rs += "<li class='ans_yes'>"+codes[i]+"</li>";
			}
            rs += "<li class='ans_no'>"+codes[codes.length-1]+"</li>";
            for(var i=codes.length;i<that.nums;i++){
                rs += "<li class='ans_wait'></li>";
            }
			rs += "</ul>";
            document.getElementById('gameResult').innerHTML = rs;      
            document.getElementById('okNum').innerHTML = '0';
			that.socket.emit('noSelect');
        });
		
		document.getElementById('slt0').addEventListener('click', function() {
			that.socket.emit('select', "0");
		});
		document.getElementById('slt1').addEventListener('click', function() {
			that.socket.emit('select', "1");
		});
        document.getElementById('loginBtn').addEventListener('click', function() {
            var nickName = document.getElementById('nicknameInput').value;
            if (nickName.trim().length != 0) {
                that.socket.emit('login', nickName);
            } else {
                document.getElementById('nicknameInput').focus();
            };
        }, false);
        document.getElementById('nicknameInput').addEventListener('keyup', function(e) {
            if (e.keyCode == 13) {
                var nickName = document.getElementById('nicknameInput').value;
                if (nickName.trim().length != 0) {
                    that.socket.emit('login', nickName);
                };
            };
        }, false);
        document.getElementById('sendBtn').addEventListener('click', function() {
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value,
                color = document.getElementById('colorStyle').value;
            messageInput.value = '';
            messageInput.focus();
            if (msg.trim().length != 0) {
                that.socket.emit('postMsg', msg, color);
                that._displayNewMsg('me', msg, color);
                return;
            };
        }, false);
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
        document.getElementById('clearBtn').addEventListener('click', function() {
            document.getElementById('historyMsg').innerHTML = '';
        }, false);
        document.getElementById('sendImage').addEventListener('change', function() {
            if (this.files.length != 0) {
                var file = this.files[0],
                    reader = new FileReader(),
                    color = document.getElementById('colorStyle').value;
                if (!reader) {
                    that._displayNewMsg('system', '!your browser doesn\'t support fileReader', 'red');
                    this.value = '';
                    return;
                };
                reader.onload = function(e) {
                    this.value = '';
                    that.socket.emit('img', e.target.result, color);
                    that._displayImage('me', e.target.result, color);
                };
                reader.readAsDataURL(file);
            };
        }, false);
        document.getElementById('emojis').addEventListener('click', function(e) {
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
        document.getElementById('emojiWrapper').addEventListener('click', function(e) {
            var target = e.target;
            if (target.nodeName.toLowerCase() == 'img') {
                var messageInput = document.getElementById('messageInput');
                messageInput.focus();
                messageInput.value = messageInput.value + '[emoji:' + target.title + ']';
            };
        }, false);
		document.getElementById('exit').addEventListener('click', function(e) {
            document.getElementById('historyMsg').innerHTML = '';
			that._exitRooms();
		});
    },
	toRooms:function(id,num){
		var that = this;
        this.nums = num;
        that.nums = num;
        that.ids = id;
		that.socket.emit('toRoom', id);
		document.getElementById('rooms').style.display = 'none';
		document.getElementById('youxi').style.display = 'block';
	},
	_exitRooms:function(){
		var that = this;
		that.socket.emit('exitRoom');
		document.getElementById('rooms').style.display = 'block';
		document.getElementById('youxi').style.display = 'none';
	},
	_displayRoomSuc:function(rId,num,mNum,sNum){
		var inHtml = "";
		for(var i=0;i<mNum;i++){
			if(i<num){
				inHtml += "<li class='okay'></li>";
			}else if(i<sNum){
				inHtml += "<li class='wait'></li>";
			}else{
				inHtml += "<li class='none'></li>";
			}
		}
		document.getElementById('room_'+rId).innerHTML = inHtml;
	},
	_playerIn:function(rId,weizhi){
		var content=document.getElementById('room_'+rId); 
		var items=content.getElementsByTagName("li"); 
		items[weizhi].className = "wait";
	},
	_playerOut:function(rId,weizhi){
		var content=document.getElementById('room_'+rId); 
		var items=content.getElementsByTagName("li"); 
		items[weizhi].className = "none";
	},
	_displayRoomEro:function(rId,mNum,sNum){
		var inHtml = "";
		for(var i=0;i<mNum;i++){
			if(i<sNum){
				inHtml += "<li class='wait'></li>";
			}else{
				inHtml += "<li class='none'></li>";
			}
		}
		document.getElementById('room_'+rId).innerHTML = inHtml;
		document.getElementById('status').textContent = sNum + (sNum > 1 ? ' users' : ' user') + ' joined';
	},
	_displayResult:function(codes, CODE, num){
		var rs = "";
		if(CODE == "--"){
			rs = "<ul>";
			for(var i=0;i<codes.length;i++){
				rs += "<li class='ans_yes'>"+codes[i]+"</li>";
			}
            for(var i=codes.length;i<num;i++){
                rs += "<li class='ans_wait'></li>";
            }
			rs += "</ul>";
            document.getElementById('gameResult').innerHTML = rs;
            document.getElementById('okNum').innerHTML = codes.length;
		}else{
			rs = "<ul>";
			for(var i=0;i<codes.length-1;i++){
				rs += "<li class='ans_yes'>"+codes[i]+"</li>";
			}
            rs += "<li class='ans_no'>"+codes[codes.length-1]+"</li>";
            for(var i=codes.length;i<num;i++){
                rs += "<li class='ans_wait'></li>";
            }
			rs += "</ul>";
            document.getElementById('gameResult').innerHTML = rs;
            document.getElementById('okNum').innerHTML = '0';
		}
	},
    _displayNewMsg: function(user, msg, color) {
        var container = document.getElementById('historyMsg'),
            oneMsg = document.createElement('div');
            msgToDisplay = document.createElement('p'),
            msgUser = document.createElement('a'),
            msgTime = document.createElement('span'),
            date = new Date().toTimeString().substr(0, 8),
            //determine whether the msg contains emojimsgToDisplay
            msg = this._showEmoji(msg);
        msgToDisplay.style.color = color || '#000';
        if(user == "me"){
            msgToDisplay.className = "me";
            msgToDisplay.innerHTML = msg;
            msgUser.innerHTML = user;
            msgTime.innerHTML = "<img src='../content/time.png' />"+date;
            oneMsg.className = "twoMsg";
            oneMsg.appendChild(msgUser);
            oneMsg.appendChild(msgToDisplay);
            oneMsg.appendChild(msgTime);
            container.appendChild(oneMsg);
            container.scrollTop = container.scrollHeight;
        }else if(user == "system"){
            msgToDisplay.className = "system";
            msgToDisplay.innerHTML =  msg;
            msgUser.innerHTML = user;
            msgTime.innerHTML = "<img src='../content/time.png' />"+date;
            oneMsg.className = "oneMsg";
            oneMsg.appendChild(msgUser);
            oneMsg.appendChild(msgToDisplay);
            oneMsg.appendChild(msgTime);
            container.appendChild(oneMsg);
            container.scrollTop = container.scrollHeight;
        }else{
            msgToDisplay.className = "other";
            msgToDisplay.innerHTML =  msg;
            msgUser.innerHTML = user;
            msgTime.innerHTML = "<img src='../content/time.png' />"+date;
            oneMsg.className = "oneMsg";
            oneMsg.appendChild(msgUser);
            oneMsg.appendChild(msgToDisplay);
            oneMsg.appendChild(msgTime);
            container.appendChild(oneMsg);
            container.scrollTop = container.scrollHeight;            
        }
    },
    _displayImage: function(user, imgData, color) {
        var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8);
        msgToDisplay.style.color = color || '#000';
        msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span> <br/>' + '<a href="' + imgData + '" target="_blank"><img src="' + imgData + '"/></a>';
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
    },
    _showEmoji: function(msg) {
        var match, result = msg,
            reg = /\[emoji:\d+\]/g,
            emojiIndex,
            totalEmojiNum = document.getElementById('emojiWrapper').children.length;
        while (match = reg.exec(msg)) {
            emojiIndex = match[0].slice(7, -1);
            if (emojiIndex > totalEmojiNum) {
                result = result.replace(match[0], '[X]');
            } else {
                result = result.replace(match[0], '<img class="emoji" src="../content/emoji/' + emojiIndex + '.gif" />');//todo:fix this in chrome it will cause a new request for the image
            };
        };
        return result;
    }
};
function toRoom(id,num){
	roomId = id;
	document.getElementById('t').innerHTML = ""+id;
	document.getElementById('historyMsg').innerHTML = '';
	hichat.toRooms(id,num);
}
