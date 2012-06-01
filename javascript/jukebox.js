// constants
var K_COOKIE_ROOMPARSEID = "jukebox_roomParseID";


var sp = getSpotifyApi(1);
var models = sp.require('sp://import/scripts/api/models');
var player = models.player;
var jukeBoxObj;
var lastRemovedSongId;

var repeatIntervalId;
var justChangedSong = true;
var biggestJukeBoxID;

$(document).ready(function() {
	/*
	1. Initialize Parse
	1. Start a timer for a refresh request
	2. Check for existing roomParseID cookie. If it exists, get room's Parse ID
	3. Add a trigger for the song finished/new song event
	
	1. Initialize Parse
	2. Check for the cookie
	  2.1. If cookie exists, then load up the JukeBox with the provided ID
	  2.2. If cookie does not exist, then present "Make New Room" button
	 */
	
	// 1. Initialize Parse
	Parse.initialize("L6g7AozXjr5TQ06YtuTXjSs15NZwfYiRnDnaeAn9","hJJZ0klmj1z4VRXlasl6ctAoHvTQcqqi8CTnf7gm");
	
	// 2. Check for existing roomParseID cookie. If it exists, get room Parse ID
	var roomParseID = $.cookie(K_COOKIE_ROOMPARSEID);
	if(roomParseID)
	{		
		var JukeBoxObject = Parse.Object.extend("JukeBox");
		var query = new Parse.Query(JukeBoxObject);
		query.get(roomParseID, {
			success: function (theRoom) {
				// the JukeBox room was retrieved successfully
			},
			error: function (error) {
				// an error occured
			}
		});
	}
	
	console.log ("Start of initializing of the Juke Box webpage.");

	// 1. Start a timer for a refresh request
	setTimeout("requestRefresh()", 1);
	repeatIntervalId = setInterval("requestRefresh()", 30000);
		
	// 3. Add a trigger for the song finished/new song event
	player.observe(models.EVENT.CHANGE, function (e) {
		console.log(e);
		
		// Only update the page if the track changed
		if (e.data.curtrack == true && !justChangedSong) {
			playFirstSongInQueueIfExistsAndUpdateQueue();
		}
		else if (justChangedSong)
		{
			// Song just got changed, so update the track name
			updateTrackName();
			justChangedSong = false;
		}
	});
});

// Plays the first song in the queue and updates the queue on the client and the server side
function playFirstSongInQueueIfExistsAndUpdateQueue() {
	if (jukeBoxObj.queue.length > 0) 
	{
		console.log("Player track: " + jukeBoxObj.queue[0]);
		player.play(jukeBoxObj.queue[0]);
		justChangedSong = true;
		updateTheQueue();
	}
}


// Removes the first track in the queue both on our client and on the Parse server
function updateTheQueue()
{
	// stop interval for a bit
	clearInterval(repeatIntervalId);
	
	// update the queue on our side then send it to the server
	var songId = removeFirstSongFromQueue();
	if (songId != null)
	{
		var newQueue = {};
		newQueue["queue"] = jukeBoxObj.queue;
		newQueue["currentTrack"] = songId;
		
		var request = $.ajax({
			url:"https://api.parse.com/1/classes/JukeBox/" + jukeBoxObj.objectId,
			type:"PUT",
			contentType:"application/json",
			data:JSON.stringify(newQueue),
			beforeSend:setParseHeaders,
			success: function (data) {
				console.log("Queue updated on server.");
				repeatIntervalId = setInterval("requestRefresh()", 30000);
			}
		});
	}
}

// Gets the latest JukeBox ID. Can call another method after we get the latest juke box id
function getLatestJukeBoxID(methodToCall)
{
	var request = $.ajax({
		url:"https://api.parse.com/1/classes/LatestJukeBoxId/fC9JtGyo99",
		type:"GET",
		contentType:"application/json",
		data: null,
		beforeSend:setParseHeaders,
		success: function (data) {
			console.log("Answer received from server: ");	
			$.each(data, function(key, value) {
				console.log(key + ":" + value);
				if (key == "lastID") biggestJukeBoxID = value;
			});
			
			// if there's a method we need to call afterwards, call it!
			if (methodToCall)
			{
				methodToCall();
			}
		}
	});
}

// Return the Parse headers
function parseHeaders()
{
	return '{"X-Parse-Application-Id" : "L6g7AozXjr5TQ06YtuTXjSs15NZwfYiRnDnaeAn9", "X-Parse-REST-API-Key" : "wWCqQn5xVp0WeZFC2bnuqzv0dJLmsTkHwSDGGjzz"}';
}

$(document).keypress(function(event) {
	// if this is the space key press event do the opposite of what's going on now
	if (event.keyCode == 32)
	{
		player.playing = !(player.playing);
	}
});

function updatePageWithQueue() {	
	$('#queue_container').empty();
	
	if (!jukeBoxObj.queue) return;
	
	for (var i=0; i < jukeBoxObj.queue.length; i++) {
		var trackAtLocation = models.Track.fromURI(jukeBoxObj.queue[i], function(track) {
			$('#queue_container').append('<div id="queue_song_' + i + '">' + track.name + ' by ' + track.artists + '</div>');	
		});
	};
}

function updateTrackName()
{
	// This will be null if nothing is playing.
	var playerTrackInfo = player.track;
	
	$('#now_playing').empty();
	if (playerTrackInfo == null) {
		$('#now_playing').append("<p>Nothing playing</p>");
	} else {
		var track = playerTrackInfo.data;
		$('#now_playing').append("<p> Playing " + playerTrackInfo.name + " by " + playerTrackInfo.album.artist.name + "</p>");
	}
}

function requestRefresh()
{
	$.ajax({
		url:"https://api.parse.com/1/classes/JukeBox/noU0wSd95X",
		type:"GET",
		contentType:"application/json",
		data: "",
		beforeSend:setParseHeaders,
		success: function (data) {
			console.log("Answer received from server: " + data);
			$.each(data, function(key, value) {
				console.log(key + ":" + value);
			});
			
			jukeBoxObj = data;
			console.log("The juke box object is: " + jukeBoxObj);
			
			refreshQueue();
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log("error has been thrown.");
			console.log(errorThrown);
			console.log(textStatus);
		}
	});
}

// Callback when we have the latest information about the queue
function refreshQueue()
{	
	updatePageWithQueue();
		
	// start playing if first time calling
	if (justChangedSong)
	{
		playFirstSongInQueueIfExistsAndUpdateQueue();
	}
}

// sets the Parse headers for an application
function setParseHeaders(xhr) {
    xhr.setRequestHeader("X-Parse-Application-Id", "L6g7AozXjr5TQ06YtuTXjSs15NZwfYiRnDnaeAn9");
    xhr.setRequestHeader("X-Parse-REST-API-Key", "wWCqQn5xVp0WeZFC2bnuqzv0dJLmsTkHwSDGGjzz");
}

function removeFirstSongFromQueue()
{
	if (jukeBoxObj.queue.length > 0)
	{
		var removedSongId = jukeBoxObj.queue.shift();
		updatePageWithQueue();
		console.log("Removed song id: " + removedSongId);
		lastRemovedSongId = removedSongId;
		return removedSongId;
	}
	
	return null;
}

function createNewJukeBox()
{
	/* Must do 3 things:
		1. Make request to Parse and get the latest JukeBox ID
		2. Create JukeBox on Parse with JukeBox ID + 1
		3. Save cookie with user's JukeBox ID in Spotify browser
		4. Update latest JukeBox ID on Parse
		
		TODO: Go to next page
	*/
	
	// 1. Get latest juke box ID
	getLatestJukeBoxID(function() {
		// 2. Create JB on Parse with id + 1
		console.log("Step 1 DONE! Got the latest ID.");
		var nextJukeBoxID = biggestJukeBoxID + 1;
		var jukeboxInfo = '{"name":"jukebox_' + nextJukeBoxID + '", "jukeBoxID":"' + nextJukeBoxID + '"}';
		
		// 3. Save cookie with user's JukeBox ID in Spotify browser. Expire in 7 days
		$.cookie(K_COOKIE_ROOMPARSEID, nextJukeBoxID, {expires: 7});
		
		var request = $.ajax({
			url:"https://api.parse.com/1/classes/JukeBox",
			type:"POST",
			contentType:"application/json",
			data: jukeboxInfo,
			beforeSend:setParseHeaders,
			// 4. Update latest JB ID on Parse on success
			success: function (data) {
				console.log("Step 2 DONE! Created new JukeBox.")
				console.log("======== Answer received from server: ========");	
				$.each(data, function(key, value) {
					console.log(key + ":" + value);
				});
				
				// 4. Update latest JB ID on Parse
				updateLatestJukeBoxIDOnParse(nextJukeBoxID);
			}
		});
		
			
	});	
}

// updates the latest Juke Box ID on parse
function updateLatestJukeBoxIDOnParse(newJukeBoxID)
{
	$.ajax({
		url:"https://api.parse.com/1/classes/LatestJukeBoxId/fC9JtGyo99",
		type:"PUT",
		contentType:"application/json",
		data:'{"lastID":' + newJukeBoxID + '}',
		beforeSend:setParseHeaders,
		success:function(data) {
			console.log("Step 3 DONE! Updated latest Juke Box ID.")
		}
	});
}