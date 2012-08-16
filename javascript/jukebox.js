// constants
var K_COOKIE_ROOMPARSEID = "jukebox_roomParseID";


// Parse extended objects
var JukeBoxObject = Parse.Object.extend("JukeBox");


var sp = getSpotifyApi(1);
var models = sp.require('sp://import/scripts/api/models');
var player = models.player;
var jukeBoxObj = {};

// This variable will hold the juke box room that we retrieve from Parse
var JukeBoxRoomFromParse;
var LatestJukeBoxIDFromParse;
var lastRemovedSongId;

var repeatIntervalId;
var justChangedSong = true;
var biggestJukeBoxID;

$(document).ready(function() {
	/*	
	1. Initialize Parse
	2. Check for the cookie
	  2.1. If cookie exists, then load up the JukeBox with the provided ID
	  2.2. If cookie does not exist, then present "Make New Room" button
	 */
	
	// Prepare UI for Facebook authentication
	initializeFacebookAuth();
			
	// 1. Initialize Parse
	Parse.initialize("L6g7AozXjr5TQ06YtuTXjSs15NZwfYiRnDnaeAn9","hJJZ0klmj1z4VRXlasl6ctAoHvTQcqqi8CTnf7gm");
	
	// 2. Check for existing roomParseID cookie. If it exists, get room Parse ID
	var roomParseID = $.cookie(K_COOKIE_ROOMPARSEID);
	if(roomParseID)
	{
		showPlayQueue(true);
				
		var query = new Parse.Query(JukeBoxObject);
		query.get(roomParseID, {
			success: function (theRoom) {
				JukeBoxRoomFromParse = theRoom;
				
				// the JukeBox room was retrieved successfully
				jukeBoxObj.queue = theRoom.get("queue");
				if (!jukeBoxObj.queue) jukeBoxObj.queue = [];
				
				// puts the name of the jukebox in the h1 tag				
				$("#jukebox_room_name").text(theRoom.get("name"));
				$("#jukebox_number").text(theRoom.get("jukeBoxID"));
				
				jukeBoxObj.objectId = theRoom.id;
				
				observePlayerEventChanges();				
				playFirstSongInQueueIfExistsAndUpdateQueue();
				
				updatePageWithQueue();
			},
			error: function (error) {
				// an error occured
			}
		});
		
		// 3. Register a doRefresh for the main JukeBoxRoomFromParse object
		repeatIntervalId = setInterval("doRefresh()", 2000);
	}
	else
	{
	}
});

/* Refreshes the information from the server */
function doRefresh()
{
	JukeBoxRoomFromParse.fetch({
		success: function (theRoom) {
			JukeBoxRoomFromParse = theRoom;
			jukeBoxObj.queue = theRoom.get("queue");
			jukeBoxObj.objectId = theRoom.id;
			
			updatePageWithQueue();
		},
		error: function(error) {
			
		}
	});
}

/* Observes player change events */
function observePlayerEventChanges()
{
	player.observe(models.EVENT.CHANGE, function (e) {
		console.log("Change event:\n" + e);
		
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
}

// Plays the first song in the queue and updates the queue on the server
function playFirstSongInQueueIfExistsAndUpdateQueue() {
	if (jukeBoxObj.queue.length > 0) 
	{
		console.log("Player track: " + jukeBoxObj.queue[0]);
		
		// 1. Pop first song from queue
		var nowPlayingSong = jukeBoxObj.queue.shift();
		
		// 2. Save new queue
		JukeBoxRoomFromParse.set("queue", jukeBoxObj.queue);
		JukeBoxRoomFromParse.save();
		
		justChangedSong = true;		
		player.play(nowPlayingSong);
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

/* Updates Queue Container UI */
function updatePageWithQueue() {	
	$('#queue_container').empty();
	
	if (!jukeBoxObj.queue) return;
	
	for (var i=0; i < jukeBoxObj.queue.length; i++) {
		var trackAtLocation = models.Track.fromURI(jukeBoxObj.queue[i], function(track) {
			$('#queue_container').append('<div id="queue_song_' + i + '">' + track.name + ' by ' + track.artists + '</div>');	
		});
	};
}

/* Updates Track Container UI & updates track on server */
function updateTrackName()
{
	// This will be null if nothing is playing.
	var playerTrackInfo = player.track;
	
	// set the current track on the server and save
	JukeBoxRoomFromParse.set("currentTrack", playerTrackInfo.uri);
	JukeBoxRoomFromParse.save();
	
	$('#now_playing').empty();
	if (playerTrackInfo == null) {
		$('#now_playing').append("<p>Nothing playing</p>");
	} else {
		var track = playerTrackInfo.data;
		$('#now_playing').append("<p> Playing " + playerTrackInfo.name + " by " + playerTrackInfo.album.artist.name + "</p>");
	}
}

/// ========== Other Methods ==============

/* Depending on the boolean given, shows the 'make new room' button or
 * shows the 'now playing' and 'queue' divs
 */
function showPlayQueue(showPlayQueue)
{
	if (!showPlayQueue)
	{
		$("#container_create_new_jukebox").show();
		$("#container_now_playing").hide();
		$("#container_the_queue").hide();
	}
	else
	{
		$("#container_now_playing").show();
		$("#container_the_queue").show();
		$("#container_create_new_jukebox").hide();
	}
}

/* Forgets about this JukeBox: removes the cookie from the browser
 * and removes the room from the server
 */
function forgetThisJukeBox()
{
	// remove the cookie
	$.cookie(K_COOKIE_ROOMPARSEID, null);
	
	// remove the room
	if (JukeBoxRoomFromParse)
	{
		JukeBoxRoomFromParse.destroy({
			success: function (theDestroyedObject)
			{
				// object successfully destroyed
				window.location = "index.html";
			},
			error: function (theObjectThatWasSupposedToBeDestroyed, theError)
			{
				console.log("There was an error deleting the object: " + theError);
			}
		});
	}
	else
	{
		window.location = "index.html";
	}
}

/* Monitors keypresses */
$(document).keypress(function(event) {
	// if this is the space key press event do the opposite of what's going on now
	if (event.keyCode == 32)
	{
		player.playing = !(player.playing);
	}
});