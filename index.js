// Server side interface
// look in .sound-brick-loader.js for settings and setup

console.log("sound-brick: If you see any error talking about InterfacePort then PM SmartLion about it")
var port = InterfacePort //The port the server runs on.
console.log("sound-brick: But it seems that this script is working fine if you see this")


io = io(http, {
	path: InterfaceIoPath,
})

var users = 0
var sockets = []

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html')
})

app.use('/sounds', express.static(__dirname + "/sounds", { maxAge: 1800 })) // Cache: 30 min

http.listen(port, function () {
	console.log('sound-brick is listening on *: ' + port.toString())
})

io.on('connection', function (socket) {
	users += 1
	sockets.push(socket)
	socket.socketarrayindex = sockets.length - 1

	socket.hasRequested = false
	socket.isWaiting = false
	socket.isLinked = false
	socket.playerobject = 0
	console.log('User connected. ' + users.toString() + " users connected.")
	socket.on('disconnect', function () {
		if (socket.isWaiting == true) {
			socket.playerobject.isSocketWaiting = false
		}
		if (socket.isLinked == true) {
			socket.playerobject.message(`\\c7[SOUND-BRICK]: \\c6Your sound-brick session has disconnected!`)
			socket.playerobject.isLinked = false
		}
		users -= 1
		sockets.splice(sockets.indexOf(socket), 1)
		console.log('User disconnected. ' + users.toString() + " users connected.")
	})

	socket.on('chatmessage', function (chatmessage) { //Send invite to player
		console.log(chatmessage)
		if (socket.hasRequested == false) {
			var player = getPlayer(chatmessage)
			if (player) {
				if (player.isLinked == false) {
					socket.hasRequested = true
					player.isSocketWaiting = true
					player.waitingSocket = socket
					player.message(`\\c7[SOUND-BRICK]: \\c0Did you request a link? Type in \\c5/accept \\c0to accept the sound link`)
				}
			}
		}
	})
})

// url: "www.example.com/wave.mp3", // [Required]
// position: "a vector3", // [Optional] 3D sound position (Ignored if minDistance and maxDistance is not provided)
// isGlobal: true, // [Required] If enabled then position, minDistance, minDecay and maxDistance will be ignored
// minDistance: 50, // [Optional] Distance before sound completely becomes unhearable (default 50)
// maxDistance: 10, // [Optional] Distance for full volume (default 10)
// isloop: false, // [Optional] [NOTE: If enabled then isGlobal will be set to true] If enabled then current playing loop will start over if url isnt the same
// musiccredit: "Mmuscic name | Mr Author | Licensed under Creative Commons: By Attribution 4.0 License", // [Optional] [Recommended for music loops] Credit!

function playSound(data, player) {
	var clientdata = {}

	if (data == undefined) return console.log("sound-brick got no sound object")

	if (data.url == undefined) return console.log("sound-brick got no sound url")

	if (data.isGlobal == undefined) return console.log("isGlobal was not provided")

	if (data.position !== undefined) {
		clientdata.position = data.position

		if (data.minDistance == undefined) {
			clientdata.minDistance = 50
		} else {
			clientdata.minDistance = data.minDistance
		}

		if (data.maxDistance == undefined) {
			clientdata.maxDistance = 10
		} else {
			clientdata.maxDistance = data.maxDistance
		}


	}

	clientdata.url = data.url

	if (data.isloop == undefined) {
		clientdata.isloop = false
	} else {
		clientdata.isloop = data.isloop
	}

	if (data.musiccredit !== undefined) {
		clientdata.musiccredit = data.musiccredit
	}

	// clear unneeded varibles before sending client data
	if (player) { // sound begins to play
		if (player.isLinked == true) {
			if (clientdata.position !== undefined) {
				var distance = Game.pointDistance3D(player.position, clientdata.position)
				var canPlay = false
				if (distance < clientdata.maxDistance) {
					canPlay = true
					clientdata.volume = 1
				} else {
					if (distance > clientdata.minDistance) {
						// ntohign! LMAO funny
					} else {
						var newvolume = 1 - (distance / clientdata.minDistance) //note this might be very wrong so fix it if its wrong

						canPlay = true
						clientdata.volume = newvolume
					}
				}

				if (canPlay == false) return

				player.soundSocket.emit(`playSound`, clientdata)
			} else {
				clientdata.volume = 1
				player.soundSocket.emit(`playSound`, clientdata) // else just emit the global sound
			}
		}
	} else {
		if (clientdata.position !== undefined) {
			sockets.forEach((socket) => {
				if (!socket.playerobject) return
				var distance = Game.pointDistance3D(socket.playerobject.position, clientdata.position)
				var canPlay = false
				if (distance < clientdata.maxDistance) {
					canPlay = true
					clientdata.volume = 1
				} else {
					if (distance > clientdata.minDistance) {
						// ntohign! LMAO funny
					} else {
						var newvolume = 1 - (distance / clientdata.minDistance) //note this might be very wrong so fix it if its wrong

						canPlay = true
						clientdata.volume = newvolume
					}
				}

				if (canPlay == false) return

				delete clientdata.isGlobal
				delete clientdata.position
				delete clientdata.minDistance
				delete clientdata.maxDistance
				socket.emit(`playSound`, clientdata)
			})
		} else {
			delete clientdata.isGlobal
			delete clientdata.position
			delete clientdata.minDistance
			delete clientdata.maxDistance
			clientdata.volume = 1
			io.emit(`playSound`, clientdata) // else just emit the global sound
		}
	}

}

function getPlayer(name) {
	for (let player of Game.players) {
		if (player.username.toLowerCase().indexOf(String(name).toLowerCase()) == 0) {
			const victim = Array.from(Game.players).find(p => p.username === player.username)
			return victim
		}
	}
}

Game.command("accept", (caller, args) => {
	if (caller.isLinked == false) {
		if (caller.isSocketWaiting == true) {
			caller.isSocketWaiting = false
			caller.soundSocket = caller.waitingSocket
			caller.isLinked = true

			caller.soundSocket.isLinked = true
			caller.soundSocket.playerobject = caller



			caller.message(`\\c5Accepted! Sound link complete`)

			soundbrick({
				url: `http://bunnynabbit.ddns.net/audio/soundbrickcore-confirm.ogg`,
				isGlobal: true,
				isloop: false,
				musiccredit: ""
			}, caller)
		}
	}
})


Game.on("playerJoin", (player) => {
	player.isSocketWaiting = false
	player.isLinked = false
	player.soundSocket = 0
})

Game.on("playerLeave", (player) => {
	if (player.isLinked == true) {
		soundbrick({
			url: `http://bunnynabbit.ddns.net/audio/soundbrickcore-disconnect.mp3`,
			isGlobal: true,
			isloop: false,
			musiccredit: "Refresh page and relink!",
		}, player)
	}
})

module.exports = playSound
// Don't Push the Button by Ezcha