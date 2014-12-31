var express = require('express'),
	mongodb = require('mongodb'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    users = [],
	rooms = {},
	userList = {},
	ipList={},
	codes = [],
	userIP = "",
	db,
	rHtm,
	testRooms=[[9,"IPhone 5"],[10,"IPad mini"],[11,"Bicycle"],[9,"10$"],[12,"15$"]
	,[9,"IPhone 5"],[10,"IPad mini"],[11,"Bicycle"],[9,"10$"],[12,"15$"]
	,[9,"IPhone 5"],[10,"IPad mini"],[11,"Bicycle"],[9,"10$"],[12,"15$"]
	,[9,"IPhone 5"],[10,"IPad mini"],[11,"Bicycle"],[9,"10$"],[12,"15$"]];
//specify the html we will use
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use('/', express.static(__dirname + '/www'));

//bind the server to the 80 port
//server.listen(3000);//for local test
server.listen(process.env.PORT || 3000);//publish to heroku
//server.listen(process.env.OPENSHIFT_NODEJS_PORT || 3000);//publish to openshift
//console.log('server started on port'+process.env.PORT || 3000);
//handle the socket
connectDB();
initRooms();
io.sockets.on('connection', function(socket) {
	var address = socket.handshake.address;
	userIP = address.address;
/*	if(ipList[socket.handshake.address.address]){
			socket.emit('alreadyIn');
	}*/
    //new user login
    socket.on('login', function(nickname) {
		/*if(ipList[socket.handshake.address.address]){
			socket.emit('alreadyIn');
		}else*/if (users.indexOf(nickname) > -1||nickname=="system"||nickname=="me") {
            socket.emit('nickExisted');
        } else {
            socket.nickname = nickname;
			socket.roomid = -1;
            users.push(nickname);
			if (!userList[nickname]) {
				userList[nickname] = 1;
			} else {
				userList[nickname] ++;
			}
			ipList[socket.handshake.address.address] = nickname;
            socket.emit('loginSuccess');
			for(var i=0;i<2;i++){
				if(i == 0){
					refreshRooms();
				}else{
					socket.emit('initRooms',rHtm);
				}
			}
            //io.sockets.emit('system', nickname, users.length, 'login');
        };
    });
    //user leaves
    socket.on('disconnect', function() {
		if (userList[socket.nickname]) {
			userList[socket.nickname] --;
			if (userList[socket.nickname] <= 0) {
				delete userList[socket.nickname];
			}
		}
		for(ip in ipList)
		{
			if (ipList[ip] == socket.nickname)
			{
				delete ipList[ip];
			}
		}
        users.splice(users.indexOf(socket.nickname), 1);
		if(socket.roomid != -1 && socket.roomid >= 0){
			socket.broadcast.to(socket.roomid).emit('system', socket.nickname, rooms[socket.roomid].players.length, 'logout');
			socket.leave(socket.roomid);
		}
    });
    //new message get
    socket.on('postMsg', function(msg, color) {
		if(socket.roomid != -1 && socket.roomid >= 0){
        socket.broadcast.to(socket.roomid).emit('newMsg', socket.nickname, msg, color);
		}
    });
    //new image get
    socket.on('img', function(imgData, color) {
		if(socket.roomid != -1 && socket.roomid >= 0){
        socket.broadcast.to(socket.roomid).emit('newImg', socket.nickname, imgData, color);
		}
    });
	//用户是否选择置为否
	socket.on('noSelect', function(imgData, color) {
		socket.selected = -1;
    });
	//用户提交结果
	socket.on('select',function(code){
		if(socket.roomid != -1 && socket.roomid >= 0){
		//console.log(code+"  BBB");
		for(var i=0;i<=rooms[socket.roomid].players.length;i++){
			if(rooms[socket.roomid].players[i] == socket.nickname){
				if(socket.selected == 1){
				   socket.emit('alreadySelected');
				}else{
					var n = rooms[socket.roomid].players.indexOf(socket.nickname);
					if(n > rooms[socket.roomid].codes.length){
						socket.emit('waitBefore');
					}else{
					rooms[socket.roomid].codes[n] = code;
					if(code == rooms[socket.roomid].CODES[n]){
						io.sockets.in(socket.roomid).emit('suc', rooms[socket.roomid].codes);
						io.sockets.emit('succ', socket.roomid,rooms[socket.roomid].codes.length,rooms[socket.roomid].maxNum,rooms[socket.roomid].players.length);
						socket.selected = 1;
					}else{
						io.sockets.in(socket.roomid).emit('ero', rooms[socket.roomid].codes, rooms[socket.roomid].CODES);
						reCode(socket.roomid,rooms[socket.roomid].maxNum);
						//io.sockets.in(socket.roomid).selected = -1;
						var aa;
						for(var i=0;i<2;i++){
						if(i == 0){
							aa = rooms[socket.roomid].players.splice(0,(n+1));
						}else{
							//console.log("ASDF  "+aa);
							for(var j=0;j <= aa.length;j++){
							if(j == aa.length){
								rooms[socket.roomid].selectPlayers = [];
								io.sockets.emit('eroo',socket.roomid,rooms[socket.roomid].maxNum,rooms[socket.roomid].players.length);
							}else{
								if(aa[j]!=null&&aa[j]!=undefined){
									if(rooms[socket.roomid].selectPlayers.indexOf(aa[j])<0){
										rooms[socket.roomid].players.push(aa[j]);
									}
								}
							}
							}
						}
						}
					}
					}
				}
				//console.log(i+"ccc");
				break;
			}
		}
		}
		//console.log(rooms[socket.roomid].players);
	});
	//用户进入房间
	 socket.on('toRoom', function(roomid) {
	 if(roomid != -1 && roomid >= 0){
			socket.roomid = roomid;
			socket.join(roomid);
			if(rooms[socket.roomid].players.indexOf(socket.nickname) < 0){
				rooms[roomid].players.push(socket.nickname);
				socket.selected = -1;
				io.sockets.in(roomid).emit('system', socket.nickname, rooms[socket.roomid].players.length, 'login');
				if(rooms[roomid].players.length <= rooms[roomid].maxNum){
					io.sockets.emit('playerIn',roomid,rooms[roomid].players.length-1);
				}
socket.emit("roomStatus",rooms[roomid].codes,rooms[roomid].maxNum,0,rooms[socket.roomid].players.length-rooms[roomid].codes.length-1);
			}else{
				socket.selected = 1;
				if(rooms[roomid].selectPlayers.indexOf(socket.nickname)>=0){
					rooms[roomid].selectPlayers.splice(rooms[roomid].selectPlayers.indexOf(socket.nickname),1);
				}
                socket.emit("roomStatus",rooms[roomid].codes,rooms[roomid].maxNum,1,rooms[socket.roomid].players.indexOf(socket.nickname)+1);
			}
			//console.log(io.sockets.in(roomid));
			}
	 });
	 //用户离开房间
	 socket.on('exitRoom', function() {
			if(socket.roomid != -1 && socket.roomid >= 0){
				socket.leave(socket.roomid);
				socket.broadcast.to(socket.roomid).emit('system', socket.nickname, rooms[socket.roomid].players.length, 'logout');
				if(rooms[socket.roomid].players.indexOf(socket.nickname)>=0){
						if(socket.selected == -1){
							rooms[socket.roomid].players.splice(rooms[socket.roomid].players.indexOf(socket.nickname),1);
							if(rooms[socket.roomid].players.length < rooms[socket.roomid].maxNum){
								io.sockets.emit('playerOut',socket.roomid,rooms[socket.roomid].players.length);
							}
						}else{
							rooms[socket.roomid].selectPlayers.push(socket.nickname);
						}
				}
				socket.roomid = -1;
			}
			
	 });
});
//答案错误,重新生成CODE
function reCode(rId,mNum){
	//答案错误,重新生成CODE
	rooms[rId].CODES = [];
	rooms[rId].codes = [];
	for(var i=0;i<mNum;i++){
		rooms[rId].CODES.push(Math.floor(Math.random()*100)%2+"");
	}
	//console.log("AAA" + rooms[rId].CODES);
}
//数据库连接操作
function connectDB(){
var  server  = new mongodb.Server('localhost', 27017, {auto_reconnect:true});
db = new mongodb.Db('clickGame', server, {safe:true});
}
//初始化游戏大厅房间数据
function initRooms(){
db.open(function(err, db){
    if(!err){
        db.createCollection('rooms', {safe:true}, function(err, collection){
            if(err){
                console.log(err);
            }else{ 
				  /* for(var i=0;i<20;i++){
					   var item = {roomId:i, maxNum:testRooms[i][0], alreadyIn:"0", award:testRooms[i][1], CODES:[], round:"1", Aroud:"0",players:[],codes:[]};
					   collection.insert(item,{safe:true},function(err,result){
							console.log(result);
					   }); 
				   }*/
                   collection.find().sort({roomId: 1}) .toArray(function(err,docs){
						rooms = docs;
						for(var i=0;i<rooms.length;i++){
							reCode(rooms[i].roomId,rooms[i].maxNum);
							rooms[i].selectPlayers = [];
						}
                   });
                   /*
				   collection.find({name:'Tom'},function(err,data){
						if(err){
						console.log(err);
						}else{
						data.toArray(function(err,arr){
							if(err){
							console.log(err);
							}else{
							console.log(arr[0].name);
							}
						});
						}
					});*/
            }
        });
    }else{
        console.log(err);
    }
});
console.log('AJSDHDHHDHDHD　　　　　　initRooms');
}

//刷新当前游戏大厅房间数据
function refreshRooms(){
	rHtm = "<ul>";
	for(var i=0;i<=rooms.length;i++){
		if(i != rooms.length ){
			rHtm += "<li class='room' onclick=\"toRoom("+rooms[i].roomId+","+rooms[i].maxNum+")\">";
			rHtm += "<div class='roomHead'></div>";
			rHtm += "<div class='roomAward'><span>"+rooms[i].award+"</span><img src='../content/gift_box.png'></div>";
			rHtm += "<div class='roomStatus'>";
			rHtm += "<ul class='rStatus' id='room_"+rooms[i].roomId+"'>";
			for(var j=0;j<=rooms[i].maxNum;j++){
				if(j == rooms[i].maxNum){
					rHtm += "</ul>";
					rHtm += "</div>";
					rHtm += "</li>";
				}else{
					if(j<rooms[i].codes.length){
						rHtm += "<li class='okay'></li>";
					}else if(j>=rooms[i].codes.length&&j<rooms[i].players.length){
						rHtm += "<li class='wait'></li>";
					}else{
						rHtm += "<li class='none'></li>"; //'okay'  'wait'
					}
				}
			}
		}else{
			rHtm += "</ul>"
		}
	}
	console.log('AJSDHDHHDHDHD　　　　　refreshRooms');
}

