define(['jquery', 'underscore', 'backbone', 'utils'], function($, _, Backbone, utils){
	var rendertmpl = _.partial(utils.rendertmpl, _, "js/pmodules/books");

//	MODELS 
	var PatronModel = Backbone.Model.extend({
		url: 'js/json/booksModule/patron.json'	,
		defaults: {
			name: null,
			email: null,
			address: null,
			expires: null,
			status: null, 
			type: null,
			amount: null,
		},
	});

	var FeeModel = Backbone.Model.extend({
		url : 'js/json/booksModule/fees.json'
	});

	var BookModel = Backbone.Model.extend({
		defaults: {
			status: null,
		    item: null,
		    edition: null,
		    about: null,
		    label: null,
		    queue: null,
		    renewals: null,
		    reminder: null,
		    starttime: null,
		    endtime: null,
		    cancancel: null
		}
	});

	var BookCollection = Backbone.Collection.extend({
		url: 'js/json/booksModule/items.json',
		comparator: 'item',
		model: BookModel,

		parse: function(data) {
    		return data.doc;
  		}
	});	

//	VIEWS
	var BookView = Backbone.View.extend({
		tagName: 'div',

		initialize: function(){
			_.bindAll(this, 'render');
			this.template = rendertmpl('book');
		},

		render: function(){
			this.$el.html(this.template({book: this.model.toJSON()}));
			console.log("Abgabe:"+this.model.get("endtime"));
			
			var dept = hasDept(this.model.get("endtime"));
			
			// var reminder = false;
			// reminder = hasReminder(this.model.get("endtime"));

			if(dept){
				$(this.$el).prepend("<td><img style=\"margin-left: 10px\" src=\"img/up/dot_red_small%20.png\" width=\"15px\"/></td>");
				alert("Ihr Buch: "+this.model.get("about")+" muss zurückgegeben bzw. verlängert werden!");
			}
			else{
			// wenn Buch bald zurückgegeben werden muss --> wird der Button orange
				if(hasReminder(this.model.get("endtime"))){
					$(this.$el).prepend("<td><img style=\"margin-left: 10px\" src=\"img/up/dot_orange_small.png\" width=\"15px\"/></td>");
					alert("Erinnerung: Ihr Buch "+this.model.get("about")+" muss bald zurückgegeben bzw. verlängert werden!");
				}
			
				else
					$(this.$el).prepend("<td><img style=\"margin-left: 10px\" src=\"img/up/dot_green_small.png\" width=\"15px\"/></td>");
			}
			return this;
		},



		events: {
	    	"click .renew" : "renew"
		  },

		renew: function() {
		    console.log(this.model.get("item") +" verlängert");
		    
		    console.log("sending....");
	        // $.ajax({
	        //     url: "https://example.org/core/+"+"username"+"/items",
	        //     type: 'post',
	        //     dataType: 'json',
	        //     data: this.model.toJSON
	        // });		    
		}
	});

	var hasDept = function(date){
			var year = date.substr(0,4).valueOf();
			var month = date.substr(5,2).valueOf();
			var day = date.substr(8,2).valueOf();
			var hasDept = false;
			var ausgeliehen = new Date(year, month-1, day, 0, 0, 0, 0);
			var heute =  Date.now();
			error = heute-ausgeliehen.getTime();
	
			if(error > 0 ) 
				hasDept = true;
			return hasDept;
	};

	var hasReminder = function(date){
			var year = date.substr(0,4).valueOf();
			var month = date.substr(5,2).valueOf();
			var day = date.substr(8,2).valueOf();
			var hasReminder = false;
			var ausgeliehen = new Date(year, month-1, day, 0, 0, 0, 0);
			var heute =  Date.now();
			error = heute-ausgeliehen.getTime();
	
			if(error > -3*24*60*60*1000)
				hasReminder=true;
			console.log("Rückgabe-Erinnerung");
			return hasReminder;
	};
// BOOK COLLECTION VIEW
	var BookCollectionView = Backbone.View.extend({

		initialize: function(){
			_.bindAll(this, 'fetchSuccess', 'fetchError', 'render');
			this.collection.fetch({
				success: this.fetchSuccess,
				error: this.fetchError
			});
		},

		fetchSuccess: function() {
			this.render();
		},

		fetchError: function() {
			throw new Error('Error loading JSON file');
		},

		render: function(){
			var html = "<div style=\"padding-left:10px\"><br><b>Ausgeliehene Bücher und Rückgabedatum<b><br></div><table>";
	  		this.$el.html(html);
			this.collection.each(function(book){
				var bookView = new BookView({model: book});
				$(this.el).append("<tr>");
				$(this.el).append(bookView.render().el);
				$(this.el).append("</tr>");
			}, this);
			$(this.el).append("</table>");
			this.$el.trigger("create");
			return this;
		}
	});


// PATRON MODEL VIEW
	var PatronModelView = Backbone.View.extend({

		initialize: function(){
			_.bindAll(this, 'fetchSuccess', 'fetchError', 'render');
			this.template = rendertmpl('patron');
			this.model.fetch({
				success: this.fetchSuccess,
				error: this.fetchError
			});
		},

		fetchSuccess: function() {
			console.log("Fetch Sucess");
			this.render();

		},

		fetchError: function() {
			throw new Error('Error loading JSON file');
		},

	  	render: function() {
	  		this.$el.html(this.template({patron: this.model.toJSON()}));
		    return this;
		}
	});

	



// LOGIN PAGE VIEW
	app.views.BooksLogin = Backbone.View.extend({

		events: {
			'submit #loginform': 'login',
			'focus #loginform input': 'clearForm'
		},

		login: function(ev){
			ev.preventDefault();
			app.session.set('up.session.UBauthenticated', true);	
			// try to log in
			// if success
			app.route('books');
			//else do error handling
		},

		render: function() {

			this.logouttemplate = rendertmpl('login');
			this.setElement(this.page.find('#books'));
			this.$el.html(this.logouttemplate({}));

			this.$el.trigger("create");
			return this;
		}
	});


// LOGIN PAGE VIEW
	app.views.BooksLogout = Backbone.View.extend({

		events:{
			'submit #logoutform': 'logout'
		},


		logout: function(ev){
			// do logout
			app.route('');
		},

		render: function() {
			this.logouttemplate = rendertmpl('logout');
			this.setElement(this.page.find('#books'));
			this.$el.html(this.logouttemplate({}));

			this.$el.trigger("create");
			return this;
		}
	});



	//	MAIN PAGE VIEW
	app.views.BooksPage = Backbone.View.extend({
		attributes: {"id": 'books'},

		initialize: function(){
			this.template = rendertmpl('booksPage');
		},

		render: function(){
			this.$el.html(this.template({}));
			if (app.session.get('up.session.UBauthenticated', true)){


				var profile = new PatronModel();
				var fees = new FeeModel();
				fees.fetch();
				fees.save();
				profile.fetch().then(function(){
					profile.set("amount", fees.get("amount"));
					if(profile.get("amount")>0)
						alert("Es sind Gebühren fällig");
					profile.save();
				});

				
				var profileView = new PatronModelView( {model : profile});
				this.$el.append(profileView.render().el);
				var items = new BookCollection();
				var itemView = new BookCollectionView({collection: items});
				this.$el.append(itemView.render().el);
			}
			this.$el.trigger("create");
			return this;
		}
	});

	return app.views.BooksPage;
});