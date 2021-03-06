var service_path = (window.location.href.indexOf('localhost') > 0) ? 'http://localhost:3000' : 'http://pickarange.aws.af.cm';

// Models
function User(name) {
	var _this = this;
	this.storeUsername = function(username) {
		localStorage["woo_username"] = username;
		this.username = username;
	};
	this.loadPicks = function(date, callback) {
		$.getJSON(service_path + '/rosters/'+this.username+'/'+date, function(data) {
			if (data && data.roster && typeof(data.roster.date) != 'undefined') _this.picks[data.roster.date] = data.roster;
			callback();
		});
	};
	this.username = name;
	this.picks = {};		// user's roster etc. indexed by date string
	this.storeUsername(name);
};
User.getCurrentUser = function() {
	var username = User.getStoredUsername();
	if (username && username != '') {
		return new User(username);
	}
	return null;
};
User.getStoredUsername = function() {
	return localStorage["woo_username"];
};

function PlayerGroup(objPlayers) {
	var _this = this;
	this.players = new Array();
	this.player_points = objPlayers.player_points;
	var initialize = function(objPlayers) {
		for(var i=0;i<objPlayers.length;i++) {
			_this.players.push(new Player(objPlayers[i]));
		}
	};
	if (objPlayers && objPlayers.players)
		initialize(objPlayers.players);
}

function Player(objPlayer) {
	for(var i in objPlayer) {
		this[i] = objPlayer[i];
	}
}

// Views
function game_view(controller) {
	var _this = this;
	this.displayGroup = function(playergroup) {
		var html = '', players = playergroup.players;
		for(var i=0;i<players.length;i++) {
			var player = players[i];
			html += '<div class="player" data-id="' + player.id + '">'+
					'<div><img src="' + player.headshots.large.href + '"></div>'+
					'<div><a target="_blank" href="' + player.links.mobile.athletes.href.replace('playercard', 'playergamelog') + '"><span class="playerName">' + player.displayName + '</span></a></div>'+
					'<div><span class="playerInfo">' + player.positions[0].abbreviation + ' ' + player.team.abbreviation + '</span></div>'+
					'<div><span class="playerStat">' + parseInt(player.statistics[0].statCategories[0].stats[25].value).toFixed(1) + ' pts/gm</span></div>'+
					'<div><span class="playerOpp">Opp: ' + player.opp + '</span></div>'+
					'</div>'
		}
		$('#player-group').html(html);
		if (playergroup.player_points) {
			// roster has a score
			var player1score = (typeof(playergroup.player_points[players[0].id.toString()]) != 'undefined') ? playergroup.player_points[players[0].id.toString()] : 0;
			var player2score = (typeof(playergroup.player_points[players[1].id.toString()]) != 'undefined') ? playergroup.player_points[players[1].id.toString()] : 0;
			var player3score = (typeof(playergroup.player_points[players[2].id.toString()]) != 'undefined') ? playergroup.player_points[players[2].id.toString()] : 0;
			html =  '<div class="player_score_wrapper"><div class="points_graph" style="background-color:red;width:' + player1score + '%"></div><div class="points_graph points_val">' + player1score + '</div><div class="player_info">' + players[0].lastName + '</div></div>';
			html += '<div class="player_score_wrapper"><div class="points_graph" style="background-color:red;width:' + player2score + '%;margin-left:' + player1score + '%"></div><div class="points_graph points_val">' + player2score + '</div><div class="player_info">' + players[1].lastName + '</div></div>';
			html += '<div class="player_score_wrapper"><div class="points_graph" style="background-color:red;width:' + player3score + '%;margin-left:' + (player1score + player2score) + '%"></div><div class="points_graph points_val">' + player3score + '</div><div class="player_info">' + players[2].lastName + '</div></div>';
			$('#players_points_summary').html(html);
		} else {
			$('#players_points_summary').html('');
		}
	};
	var initialize = function() {
		var range_pts = $('#range_points');
		$('#player-controls .new_group').on("click", function(e){
			$.mobile.loading('show');
			$('#main').removeClass('saved');
			controller.getNewGroup(function(){$.mobile.loading('hide');});
		});
		$('#player-controls .accept').on("click", function(e){
			$('#player-controls').hide();
			$('#slider').rangeSlider({arrows:false});
			$('#slider_wrapper,#submit-wrapper').show();
		});
		$('#submit-wrapper button').on("click", function(e) {
			var slider = $("#slider");
			/*
			var players = [];
			$('div.player[data-id]').each(function() {
				players.push(parseInt($(this).attr('data-id')));
			});
			*/
			$.post(service_path + '/rosters/add',
					{	'user': controller.getUser().username,
						'date': controller.getPageDate(),
						'players': controller.getGroup().players,
						'range_min': Math.round(slider.rangeSlider("min")),
						'range_max': Math.round(slider.rangeSlider("max")),
						'points':range_pts.html(),
						'score': '-1'
					},
					function(data) {
						//submitted
						$('#main').addClass('saved');
					}
			);
		});
		$('#navigator').on('click', 'li', function(e) {
			var $this = $(this);
			var dateArr = controller.getPageDate().split('-');
			var new_page_date = new Date(dateArr[0],(dateArr[1]-1),dateArr[2],'5','0','0');
			if ($this.is('.nav_previous')) {
				controller.setPageDate(new_page_date.setDate(new_page_date.getDate()-1));
			} else if ($this.is('.nav_next')) {
				controller.setPageDate(new_page_date.setDate(new_page_date.getDate()+1));
			}
		});
		$('#signout').on("click", function(e){
			controller.getUser().storeUsername('');
			$.mobile.changePage('#username');
		});
		$("#slider")
		.on("valuesChanging", function(e, data){
			//console.log("Something moved. min: " + data.values.min + " max: " + data.values.max);
			var diff = 100 - (data.values.max - data.values.min);
			var val = Math.round(diff < 76 ? diff / 7.5 : 10 + ((diff - 75)*(90/25)));
			range_pts.html(val);
			$('#main').removeClass('saved');
		})
		.on("valuesChanged", function(e, data) {
			//$('#main').removeClass('saved');
		});
		//var user = _this.controller.getUser();
		$.mobile.changePage('#main');
	};
	initialize();
}
function user_view(controller) {
	var _this = this;
	this.controller = controller;
	var initialize = function() {
		$('#username button').on("click", function(e){
			_this.controller.setUser(new User($('#basic').val()));
			$.mobile.changePage('#main');
		});
		// Show user panel
		$.mobile.changePage('#username');
	};
	initialize();
}
function leaderboard_view(controller) {
	$.getJSON(service_path + '/leaderboard', function(data) {
		var html = '<div data-role="collapsible-set">';
		for(var i=0;i<data.length;i++) {
			html += '<div data-role="collapsible" data-collapsed="true" data-theme="e" data-content-theme="d" data-user="' + data[i]._id + '">' +
				'<h3>' + data[i]._id + '<span class="score">' + data[i].total + '</span></h3><p></p></div>';
		}
		html += '</div>';
		$('#leaderboard_wrapper').html(html);
		jQuery("#leaderboard").trigger("create");
	});
	jQuery('#leaderboard_wrapper').on('expand', 'div.ui-collapsible[data-user]', function(e) {
		e.stopPropagation();
		var $this = jQuery(e.target);
		if ($this.is('[data-user]')) {
			$.getJSON(service_path + '/rosters/summary/'+$this.attr('data-user'), function(data) {
				if (data && data.length) {
					var $content = $this.find('div.ui-collapsible-content');
					var html = '<div data-role="collapsible-set">';
					for(var j=0;j<data.length;j++) {
						html += '<div data-role="collapsible" data-collapsed="true" data-theme="b" data-content-theme="d">' +
							'<h3>' + data[j].date + '<span class="score">';
						html += (data[j].roster_points == '--') ? 'Selected' : 'Score: <strong>' + data[j].roster_points + '</strong></span>';
						html += '</h3>';
						html += '<div class="players"><table style="width:100%;">';
						for(var k=0;k<data[j].players.length;k++) {
							html += '<tr><td>' + data[j].players[k].displayName + ' ' + data[j].players[k].team.abbreviation + '</td><td><strong>' +
								((data[j].player_points[data[j].players[k].id]) ? data[j].player_points[data[j].players[k].id] : '--') + '</strong></td></tr>'
							if (k != data[j].players.length-1) html += '<br>';
						}
						html += '</table></div><div class="scores"><table style="width:100%;">'
						html += '<tr><td><span class="range">Total Player Points:</span></td><td><strong>' + data[j].score + '</strong></td></tr>';
						html += '<tr><td><span class="range">Point range:</span></td><td><strong>' + data[j].range_min + ' - ' + data[j].range_max + '</strong></td></tr>';
						html += '<tr><td><span class="range">Range value:</span></td><td><strong>' + data[j].points + '</strong></td></tr>';
						html += '</table></div></div>';
					}
					html += '</div>';
					$content.html(html);
					jQuery("#leaderboard").trigger("create");
				}
			});
		}
	});
}

// Main controller
var Controller = {};

(function() {
	var page_date = new Date();
	var user = User.getCurrentUser()
	var page = null;
	var playerGroup = null;
	Controller.getPageDate = function(date) {
		date = (date) ? date : page_date;
		return date.getFullYear().toString()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2);
	};
	Controller.setPageDate = function(date) {
		page_date = new Date(date);
		Controller.loadDate();
	};
	Controller.getNewGroup = function(callback) {
		$.getJSON(service_path + '/athletes/getGroup/'+Controller.getPageDate(), function(data){
			playerGroup = new PlayerGroup(data);
			page.displayGroup(playerGroup);
			if (callback) callback();
		});
	};
	Controller.getGroup = function() {
		return playerGroup;
	};
	Controller.loadDate = function() {
		user.loadPicks(Controller.getPageDate(), function(){
			var userpicks = user.picks[Controller.getPageDate()];
			if (userpicks) {
				var playerGroup = new PlayerGroup(userpicks);
				page.displayGroup(playerGroup);
				$('#player-controls').hide();
				$('#slider_wrapper, #score_wrapper').show();
				if ($('#slider div.ui-rangeSlider-container').length) $('#slider').rangeSlider('destroy');
				$('#slider').rangeSlider({arrows:false,defaultValues:{min: userpicks.range_min, max: userpicks.range_max}});
				$('#slider').rangeSlider('disable');
				$('#range_points').html(userpicks.points);
				$('#roster_points').html((typeof(userpicks.roster_points) != 'undefined') ? userpicks.roster_points : 0);
				$('#player_points').html((userpicks.score != -1) ? userpicks.score : 0);
				$('#main').addClass('saved');
			} else {
				//reset page
				$('#slider_wrapper, #score_wrapper').hide();
				$('#players_points_summary').html('');
				if (Controller.getPageDate() == Controller.getPageDate(new Date())) {
					$('#player-controls').show();
					$('#player-group').html('<div class="message">Make your picks for today.</div>');
				} else {
					$('#player-controls').hide();
					$('#player-group').html('<div class="message">No players picked for this day.</div>');
				}
			}
			var dateArr = Controller.getPageDate().split('-');
			var prevDate = new Date(dateArr[0],(dateArr[1]-1),dateArr[2],'5','0','0');
			prevDate.setDate(prevDate.getDate()-1);
			$('#navigator .nav_previous .ui-btn-text').html(prevDate.getFullYear()+'-'+(prevDate.getMonth()+1)+'-'+prevDate.getDate());
			$('#navigator .nav_today .ui-btn-text').html(Controller.getPageDate());
			var nextDate = new Date(dateArr[0],(dateArr[1]-1),dateArr[2],'5','0','0');
			nextDate.setDate(nextDate.getDate()+1);
			$('#navigator .nav_next .ui-btn-text').html(nextDate.getFullYear()+'-'+(nextDate.getMonth()+1)+'-'+nextDate.getDate());
		});
	};
	Controller.setUser = function(new_user, callback) {
		user = new_user;
	};
	Controller.getUser = function() {
		return user;
	};
	Controller.viewUser = function() {

	};
	var initialize = function() {
		if (!user)
			user_view(Controller);
		else {
			page = new game_view(Controller);
			Controller.loadDate();
		}
	};
	$(document).live('pagecreate', function(e) {
		if (!page)
			initialize();
	});
	$('[data-role=page]').live('pagebeforeshow', function (event, ui) {
		var page = jQuery(this);
		if (page.attr('id') == "leaderboard") {
			leaderboard_view(Controller);
		}
	});
})();


function getParameterByName(name)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}
