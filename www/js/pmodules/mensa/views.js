define([
	'jquery',
	'underscore',
	'backbone',
	'utils',
	'modules/campusmenu',
	'datebox',
	'view.utils',
	'pmodules/mensa/mensa.models'
], function($, _, Backbone, utils, campusmenu, datebox, viewUtils, models) {
	var rendertmpl = _.partial(utils.rendertmpl, _, "js/pmodules/mensa");

	var MealView = viewUtils.ElementView.extend({
		template: rendertmpl('mensa_meal'),
		postRender: function() {
			this.$el.trigger("create");
		}
	});

	var DayView = Backbone.View.extend({
		
		initialize: function() {
			this.template = rendertmpl('mensa_detail');
			this.subviews = [];
		},
		
		render: function() {
			this._cleanSubviews();
			this.$el.html(this.template({
				meals: this.collection.toJSON(),
				location: this.collection.location
			}));

			var list = this.$(".speiseplan");
			if (list.length > 0) {
				this.subviews.push(new viewUtils.ListView({
					el: list,
					collection: this.collection,
					view: MealView,
					postRender: function() {
						this.$el.collapsibleset().collapsibleset("refresh");
					}
				}).render());
			}

			this.$el.trigger("create");
			return this;
		},

		_cleanSubviews: function() {
			_.each(this.subviews, function(view) {
				view.remove();
			});
			this.subviews = [];
		},

		remove: function() {
			this._cleanSubviews();
			Backbone.View.prototype.remove.apply(this, arguments);
		}
	});

	var LocationTabView = Backbone.View.extend({

		initialize: function(params) {
			this.template = rendertmpl("mensa.tab");
			this.menus = params.menus;
			this.subviews = [];

			_.each(this.menus, function(menu) {
				this.listenTo(menu, "sync", this.render);
				this.listenTo(menu, "error", this.requestFail);
			}, this);
		},

		requestFail: function(error) {
			this.trigger("requestFail", error);
		},

		render: function() {
			this._cleanSubviews();
			this.$el.html(this.template({}));

			// Add all meal sources
			_.each(this.menus, function(menu, index) {
				this.$("#menu-list").append('<div id="loadingSpinner' + index + '"></div>');
				this.$("#menu-list").append('<div id="content' + index + '"></div>');

				this.subviews.push(new utils.LoadingView({collection: menu, el: this.$('#loadingSpinner' + index)}));
				this.subviews.push(new DayView({collection: menu, el: this.$('#content' + index)}).render());
			}, this);

			this.$el.trigger("create");
			return this;
		},

		_cleanSubviews: function() {
			_.each(this.subviews, function(view) {
				view.remove();
			});
			this.subviews = [];
		},

		remove: function() {
			this._cleanSubviews();
			Backbone.View.prototype.remove.apply(this, arguments);
		}
	});

	app.views.MensaPage = Backbone.View.extend({
		attributes: {"id": 'mensa'},

		events: {
			'click .ui-input-datebox a': 'dateBox'
		},

		initialize: function() {
			_.bindAll(this, 'render', 'updateMenuData', 'updateMenuCampus');
			this.template = rendertmpl('mensa');
			this.model = new models.AllMenus;
			this.subviews = [];
		},

		delegateCustomEvents: function() {
			this.$("div[data-role='campusmenu']").campusmenu({ onChange: this.updateMenuData });
			this.$("#mydate").bind("datebox", this.updateMenuCampus);
		},

		updateMenuData: function(options) {
			// The datebox may not be initiated yet, use the current date as default value
			var date;
			try {
				date = this.$("#mydate").datebox('getTheDate');
			} catch(error) {
				date = new Date();
			}

			this.updateMenu(options.campusName, date);
		},

		updateMenuCampus: function(e, p) {
			if (p.method === "set") {
				var source = this.$("div[data-role='campusmenu']").campusmenu("getActive");
				var date = p.date;

				this.model.set("date", date);
				//this.updateMenu(source, date);
			}
		},

		updateMenu: function(mensa, date) {
		    var uniqueDivId = _.uniqueId("id_");

			this._cleanSubviews();
		    this.$("#todaysMenu").empty();
			this.$("#todaysMenu").append('<div id="' + uniqueDivId + '"></div>');

			var locationTab = new LocationTabView({
				el: this.$("#" + uniqueDivId),
				menus: this.model.get(mensa)
			});
			this.subviews.push(locationTab);
			this.listenTo(locationTab, "requestFail", this.requestFail);
			locationTab.render();
			this.model.fetchAll(utils.cacheDefaults());
		},

		requestFail: function(error) {
			var errorPage = new utils.ErrorView({el: '#todaysMenu', msg: 'Der Mensa-Dienst ist momentan nicht erreichbar.', module: 'mensa', err: error});
		},

		dateBox: function(ev){
			ev.preventDefault();
		},

		render: function() {
			this.$el.html(this.template({}));
			this.$el.trigger("create");

			this.delegateCustomEvents();
			this.$("div[data-role='campusmenu']").campusmenu("pageshow");

			return this;
		},

		_cleanSubviews: function() {
			_.each(this.subviews, function(view) {
				view.remove();
			});
			this.subviews = [];
		},

		remove: function() {
			this._cleanSubviews();
			Backbone.View.prototype.remove.apply(this, arguments);
		}
	});

	return app.views.MensaPage;
});