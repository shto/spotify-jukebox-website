// constants
var K_COOKIE_ROOMPARSEID = "jukebox_roomParseID";

// Parse extended objects
var JukeBoxObject = Parse.Object.extend("JukeBox");

$(document).ready(function() {
	// hide button
	$("#container_create_new_jukebox").hide();
			
	// 1. Initialize Parse
	Parse.initialize("L6g7AozXjr5TQ06YtuTXjSs15NZwfYiRnDnaeAn9","hJJZ0klmj1z4VRXlasl6ctAoHvTQcqqi8CTnf7gm");
	
	// 2. Check for existing roomParseID cookie. If it exists, get room Parse ID
	var roomParseID = $.cookie(K_COOKIE_ROOMPARSEID);
	if(roomParseID)
	{
		window.location = "jukebox.html?roomID=" + roomParseID;
	}
	else
	{
		// Show button container
		$("#container_create_new_jukebox").show();
	}
	
});

/* Creates a new JukeBox object on the server. 
 * Also increments the last ID for a JukeBox 
 */
function createNewJukeBox()
{
	/* Must do 3 things:
		1. Make request to Parse and get the latest JukeBox ID
		2. Create JukeBox on Parse with JukeBox ID + 1
		3. Save cookie with user's JukeBox ID in Spotify browser
		4. Update latest JukeBox ID on Parse
		5. Go to next page
	*/
		
	// 1. Get latest JukeBox ID
	var LatestJukeBoxID = Parse.Object.extend("LatestJukeBoxId");
	var query = new Parse.Query(LatestJukeBoxID);
	var nextID = 0;
	query.get("fC9JtGyo99", {
		success: function (latestJukeBoxID) {
			nextID = latestJukeBoxID.get("lastID") + 1;
			
			console.log("Next ID: "  + nextID);
			
			// 2. Got ID. Create new Juke Box with ID of lastID + 1
			var newJukeBox = new JukeBoxObject();
			var jukeBoxName = $("#jukeBoxName_id").val();
			console.log("Room name: "  + jukeBoxName);
			newJukeBox.set("name", jukeBoxName);
			newJukeBox.set("jukeBoxID", nextID);
			newJukeBox.save(null, {
				success: function (newJukeBox) {
					// 3. Save a cookie
					var objID = newJukeBox.id;
					$.cookie(K_COOKIE_ROOMPARSEID, objID, { expires: 360 });
					
					console.log($.cookie(K_COOKIE_ROOMPARSEID));
					
					// 4. Update lastID on server side
					latestJukeBoxID.set("lastID", nextID);
					latestJukeBoxID.save();
					
					// 5. Go to next page
					window.location = "jukebox.html";
				},
				error: function (failedJukeBox, error) {
					// error triggered
				}
			});			
		},
		error: function (object, error) {
			// error triggered
		}
	});
}