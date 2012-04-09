var sp = getSpotifyApi(1);
var models = sp.require('sp://import/scripts/api/models');
var player = models.player;
var jukeBoxObj = new Array();
var lastRemovedSongId;

var repeatIntervalId;
var tempPlaylist;

var first_time_calling = true;

$(document).ready(function() {
	// create temporary playlist to hold our queue
	tempPlaylist = new models.Playlist();
	tempPlaylist.name = "JukeBox Playlist";
	
	console.log ("Start of initializing of the Juke Box webpage.");
	setTimeout("requestRefresh()", 1);
	repeatIntervalId = setInterval("requestRefresh()", 30000);
	
	// add a trigger for the event that happens when a song is finished/a new song is starting
	player.observe(models.EVENT.CHANGE, function (e) {
		console.log(e);
		console.log("Last removed song id: " + lastRemovedSongId);
		if (player.track == null)
		{
			console.log("Player.track is NULL!");
		}

		// Only update the page if the track changed
		if (e.data.curtrack == true) {			
			// do nothing if this is the first time we call this
			if (first_time_calling)
			{
				first_time_calling = false;
			}
			// only update if the current player track is null - means the previous song just finished
			else if (player.track == null)
			{
				playFirstSongInQueueIfExistsAndUpdateQueue();
			}
			
			// if there is a track in the player, update the page with the track details
			if (player.track != null)
			{
				updateTrackName();
			}
		}
	});
});

// Plays the first song in the queue and updates the queue on the client and the server side
function playFirstSongInQueueIfExistsAndUpdateQueue() {
	if (jukeBoxObj.queue.length > 0) 
	{
		console.log("Player track: " + jukeBoxObj.queue[0]);
		player.play(jukeBoxObj.queue[0]);
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
			beforeSend:setParseHeaders
		});
				
		request.done(jukeBoxQueueUpdatedOnServer);
	}
}

function jukeBoxQueueUpdatedOnServer(messageFromServer)
{
	console.log("Queue updated on server. Message: " + messageFromServer);
	repeatIntervalId = setInterval("requestRefresh()", 30000);
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
	for (var i=0; i < jukeBoxObj.queue.length; i++) {
		tempPlaylist.add(jukeBoxObj.queue[i]);
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
		$('#now_playing').append("<p> Playing " + track.name + " by " + track.album.artist.name + "</p>");
	}
}

function requestRefresh()
{
	var req = new XMLHttpRequest();
	
	// request type - GET
	req.open("GET", "https://api.parse.com/1/classes/JukeBox/noU0wSd95X");
		
	// set X-Parse-Application-ID header
	req.setRequestHeader('X-Parse-Application-Id', 'L6g7AozXjr5TQ06YtuTXjSs15NZwfYiRnDnaeAn9');
	
	// set X-Parse-REST-API-Key header
	req.setRequestHeader('X-Parse-REST-API-Key', 'wWCqQn5xVp0WeZFC2bnuqzv0dJLmsTkHwSDGGjzz');
		
	req.onreadystatechange = function() {		
		if (req.readyState = 4) {
			if (req.status == 200) {
				jukeBoxObj = JSON.parse(req.responseText);
				console.log("Response: " + req.responseText);
				refreshQueue();
			}
		}
	};
	
	req.send();
}

// Callback when we have the latest information about the queue
function refreshQueue()
{	
	updatePageWithQueue();
		
	// start playing if first time calling
	if (first_time_calling)
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
	var req = new XMLHttpRequest();

	// set request type - POST
	req.open("POST", "https://api.parse.com/1/classes/JukeBox");
	
	// set content-type header
	req.setRequestHeader('Content-Type', 'application/json');
	
	// set X-Parse-Application-ID header
	req.setRequestHeader('X-Parse-Application-Id', 'L6g7AozXjr5TQ06YtuTXjSs15NZwfYiRnDnaeAn9');
	
	// set X-Parse-REST-API-Key header
	req.setRequestHeader('X-Parse-REST-API-Key', 'wWCqQn5xVp0WeZFC2bnuqzv0dJLmsTkHwSDGGjzz');
	
	// set up the request POST data
	postData = '{"name":"Das elektrozimmer"}';
	
	req.onreadystatechange = function () {		
		if (req.readyState == 4) {
			if (req.status == 201) {
				console.log("Successfully created JukeBox.");
				console.log(req.responseText);
			}
		}
	};
	
	req.send(postData);
}