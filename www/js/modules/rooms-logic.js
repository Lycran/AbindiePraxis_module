$(document).on("pageinit", "#rooms", function () {
	$("div[data-role='campusmenu']").campusmenu({ onChange: updateRoomData });
	$("div[data-role='timeselection']").timeselection({ onChange: updateTimeData });
});

$(document).on("pageshow", "#rooms", function () {
	$("div[data-role='campusmenu']").campusmenu("pageshow");
	$("div[data-role='timeselection']").timeselection("pageshow");
});

var TimeSlot = Backbone.Model.extend({
	defaults: {
		isDefault: false,
		name: "Bezeichner",
		center: undefined,
		bounds: undefined,
		hourOffset: 0		
	},
	
	initialize: function() {
		var offset = this.get("hourOffset");
		
		var then = new Date();
		then.setHours(then.getHours() + offset);
		var bounds = this.calculateUpperAndLowerDate(then);
		
		this.set("center", then);
		this.set("bounds", bounds);
	},
	
	calculateUpperAndLowerDate: function(center) {
		var lowerHour = center.getHours() - (center.getHours() % 2);
		var upperHour = lowerHour + 2;
		
		var lower = new Date(center.getFullYear(), center.getMonth(), center.getDate(), lowerHour, 0, 0, 0);
		var upper = new Date(center.getFullYear(), center.getMonth(), center.getDate(), upperHour, 0, 0, 0);
		return {upper: upper, lower: lower};
	}
});

var TabButtonView = Backbone.View.extend({
	tagName: "li",
	
	events: {
		"click": "activate"
	},
	
	render: function() {
		var href = $('<a href="#select" class="time-menu"></a>');
		href.append(this.createLabel());
		
		if (this.model.get("isDefault")) {
			href.addClass("ui-btn-active");
		}
		
		this.$el.append(href);
		return this;
	},
	
	createLabel: function() {
		var upper = this.model.get("bounds").upper;
		var lower = this.model.get("bounds").lower;
		var name = this.model.get("name");
		return _.sprintf("%s (%02d:%02d-%02d:%02d)", name, lower.getHours(), lower.getMinutes(), upper.getHours(), upper.getMinutes());
	},
	
	activate: function(e) {
		event.preventDefault();
		this.trigger("activate", this);
	}
});

$(function() {
	$.widget("up.timeselection", {
		options: {
			onChange: function(bounds) {}
		},
		
		_create: function() {
			// Create HTML basis
			this.element.append(
				'<div data-role="controlgroup"> \
					<h3>Zeitraum:</h3> \
					<div data-role="navbar" id="timeNavbar"> \
						<ul></ul> \
					</div> \
				</div>');
			
			// Create tab data
			var now = new TimeSlot({name: "Jetzt", isDefault: true});
			var then = new TimeSlot({name: "Demnächst", hourOffset: 2});
			
			// Create tab views
			_.each([now, then], function(model) {
				var view = new TabButtonView({model: model});
				$(this.element).find("ul").append(view.render().el);
				
				var localActivate = $.proxy(this.activate, this);
				view.on("activate", localActivate);
			}, this);
			
			// Activate jQuery magic
			this.element.trigger("create");
			this.activeModel = now;
		},
		
		_destroy: function() {
		},
		
		_setOption: function(key, value) {
			this._super(key, value);
		},
		
		activate: function(view) {
			this.activeModel = view.model;
			
			var bounds = this.activeModel.get("bounds");
			this.options.onChange({ from: bounds.lower, to: bounds.upper });
			
			// For some unknown reason the usual tab selection code doesn't provide visual feedback, so we have to use a custom fix
			var target = view.$el.find("a");
			$("a", this.element).removeClass("ui-btn-active");
			target.addClass("ui-btn-active");
		},
		
		pageshow: function() {
		},
		
		getActive: function() {
			var bounds = this.activeModel.get("bounds");
			return { from: bounds.lower, to: bounds.upper };
		}
	});
});

function selector(li) {
	var house = li.attr("data-house");
	return "Haus " + house;
};

var Room = Backbone.Model.extend({
	
	initialize: function() {
		var raw = this.get("raw");
		var attributes = this.parseFreeRoom(raw);
		this.set(attributes);
	},
	
	/*
	 * Code taken from http://area51-php.erstmal.com/rauminfo/static/js/ShowRooms.js?cb=1395329676756 with slight modifications
	 */
	parseFreeRoom: function(room_string) {
        var room_match = room_string.match(/^([^\.]+)\.([^\.]+)\.(.+)/);
		
		var room = {};
        if (room_match) {
            room.campus = room_match[1];
            room.house = parseInt(room_match[2], 10);
            room.room = room_match[3];
        } else {
			room.raw = room_string;
		}
		return room;
    }
});

var RoomsCollection = Backbone.Collection.extend({
	model: Room,
	
	initialize: function() {
		this.enrich = _.bind(this.enrichData, this);
	},
	
	parse: function(response) {
		var results = response["rooms4TimeResponse"]["return"];
		return _.map(results, this.enrich);
	},
	
	enrichData: function(result) {
		return {
			raw: result,
			startTime: this.startTime.toISOString(),
			endTime: this.endTime.toISOString()
			};
	}
});

var FreeRooms = Backbone.Model.extend({
	
	initialize: function() {
		this.rooms = new RoomsCollection();
		this.rooms.url = this.createUrl();
		this.rooms.startTime = this.get("startTime");
		this.rooms.endTime = this.get("endTime");
		
		this.rooms.on("reset", _.bind(this.triggerChanged, this));
		this.rooms.on("error", this.requestFail);
	},
	
	triggerChanged: function() {
		this.trigger("change");
	},
	
	mapToId: function(campusName) {
		var campusId;
		if (campusName === "griebnitzsee") {
			campusId = 3;
		} else if (campusName === "neuespalais") {
			campusId = 1;
		} else {
			campusId = 2;
		}
		return campusId;
	},
	
	createUrl: function() {
		var campus = this.mapToId(this.get("campus"));
		var building = this.get("building");
		var startTime = this.get("startTime");
		var endTime = this.get("endTime");
		
		var request = "http://fossa.soft.cs.uni-potsdam.de:8280/services/roomsAPI/rooms4Time?format=json&startTime=%s&endTime=%s&campus=%d";
		if (building) {
			request = request + "&building=%s";
		}
		return _.sprintf(request, encodeURIComponent(startTime.toISOString()), encodeURIComponent(endTime.toISOString()), campus, building);
	},
	
	requestFail: function(error) {
		alert("Daten nicht geladen");
	}
});

var RoomDetailsCollections = Backbone.Collection.extend({
	model: function(attrs, options) {
		attrs.startTime = new Date(attrs.startTime);
		attrs.endTime = new Date(attrs.endTime);
		attrs.title = attrs.veranstaltung;
		return new Backbone.Model(_.omit(attrs, "veranstaltung"));
	},
	
	parse: function(response) {
		if (typeof response.reservations4RoomResponse === "object") {
			// The response is non-empty
			var reservations = response.reservations4RoomResponse["return"];
			
			if (Array.isArray(reservations)) {
				return reservations;
			} else {
				return [reservations];
			}
		} else {
			return [];
		}
	}
});

var RoomDetailsModel = Backbone.Model.extend({
	
	initialize: function() {
		this.reservations = new RoomDetailsCollections;
		this.reservations.url = this.createUrl();
		
		this.reservations.on("reset", _.bind(this.triggerChanged, this));
		this.reservations.on("error", _.bind(this.triggerChanged, this));
	},
	
	triggerChanged: function() {
		this.trigger("change");
	},
	
	createUrl: function() {
		// Set start and end time
		var startTime = this.get("startTime");
		startTime = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), 0, 0, 0, 0);
		startTime = startTime.toISOString();
		var endTime = this.get("endTime");
		endTime = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate() + 1, 0, 0, 0, 0);
		endTime = endTime.toISOString();
		
		var request = "http://fossa.soft.cs.uni-potsdam.de:8280/services/roomsAPI/reservations4Room?format=json&startTime=%s&endTime=%s&campus=%s&building=%s&room=%s";
		return _.sprintf(request, encodeURIComponent(startTime), encodeURIComponent(endTime), encodeURIComponent(this.get("campus")), encodeURIComponent(this.get("house")), encodeURIComponent(this.get("room")));
	}
});

var RoomsOverview = Backbone.View.extend({
	
	initialize: function() {
		this.listenTo(this.model, "change", this.render);
	},
	
	render: function() {
		$("#roomsDetailsHint").hide();
		$("#roomsOverviewHint").show();
		
		var host = this.$el;
		host.empty();
		
		var attributes = this.model.rooms.map(function(model) { return model.attributes; });
		
		// Create and add html
		var createRooms = rendertmpl('rooms');
		var htmlDay = createRooms({rooms: _.groupBy(attributes, "house")});
		host.append(htmlDay);
		
		// Refresh html
		host.trigger("create");
		
		$("a", host).bind("click", function(event) {
			event.preventDefault();
			
			var href = $(this).attr("href");
			var roomDetails = new URI(href).search(true).room;
			if (roomDetails) {
				var room = JSON.parse(roomDetails);
				showRoomDetails(room);
			}
		});
	}
});

var RoomDetailsView = Backbone.View.extend({
	
	initialize: function() {
		this.listenTo(this.model, "change", this.render);
	},
	
	render: function() {
		$("#roomsOverviewHint").hide();
		$("#roomsDetailsHint").show();
		
		var host = this.$el;
		host.empty();
		
		var reservations = this.model.reservations.map(function(d) { return d.attributes; });
		
		// Create and add html
		var createDetails = rendertmpl('roomDetails');
		var htmlDay = createDetails({reservations: reservations, room: this.model.attributes});
		host.append(htmlDay);
		
		// Refresh html
		host.trigger("create");
	}
});

function updateTimeData(bounds) {
	var campus = $("div[data-role='campusmenu']").campusmenu("getActive");
	updateRoom(campus, bounds);
}

function updateRoomData(campus) {
	var timeBounds = $("div[data-role='timeselection']").timeselection("getActive");
	updateRoom(campus.campusName, timeBounds);
}

function showRoomDetails(room) {
	currentView && currentView.remove();
	var div = $("<div></div>").appendTo("#roomsHost");
	
	var roomDetails = new RoomDetailsModel({campus: room.campus, house: room.house, room: room.room, startTime: new Date(room.startTime), endTime: new Date(room.endTime)});
	currentView = new RoomDetailsView({el: div, model: roomDetails});
	
	roomDetails.reservations.fetch({reset: true});
}

var lastRoomsCampus = undefined;
var currentView = undefined;

function updateRoom(campusName, timeBounds) {
	lastRoomsCampus = campusName;
	currentView && currentView.remove();
	var div = $("<div></div>").appendTo("#roomsHost");
	
	var roomsModel = new FreeRooms({campus: campusName, startTime: timeBounds.from, endTime: timeBounds.to});
	currentView = new RoomsOverview({el: div, model: roomsModel});
	
	roomsModel.rooms.fetch({reset: true});
}

function roomsReset() {
	$("div[data-role='campusmenu']").campusmenu("changeTo", lastRoomsCampus);
}
