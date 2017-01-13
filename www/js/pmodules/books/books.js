define(['jquery', 'underscore', 'backbone', 'utils'], function($, _, Backbone, utils){
	var rendertmpl = _.partial(utils.rendertmpl, _, "js/pmodules/books");

//	MODELS 
	var PatronModel = Backbone.Model.extend({
		url: 'js/json/test/patron.json'	,
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
		url : 'js/json/test/fees.json'
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
		url: 'js/json/test/items.json',
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
			console.log(this.model.get("endtime"));
			if(hasDept(this.model.get("endtime"))){
				$(".expired").css("background-color", "red");
				console.log("You have Dept to pay!");
				alert("Ihr Buch: "+this.model.get("about")+" muss zurückgegeben bzw. verlängert werden!");
			}
			else{
				$(".expired").css("background-color", "white");
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

			var d1 = new Date(year, month, day, 0, 0, 0, 0);
			var heute = new Date();
			var error = heute-d1;

			if(error > 0 ) 
				hasDept = true;
			return hasDept;
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
			var html = "<br><b>Ausgeliehene Bücher und Rückgabedatum<b><br><table>";

	  		this.$el.html(html);

			this.collection.each(function(book){
				var bookView = new BookView({model: book});
				$(this.el).append("<tr>");
				$(this.el).append(bookView.render().el);
				$(this.el).append("</tr>");
			}, this);

			$(this.el).append("</table>");

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

	
//	MAIN PAGE VIEW
	app.views.BooksPage = Backbone.View.extend({

		initialize: function() {
			this.template = rendertmpl('booksPage');
		},

		render: function() {
			this.$el.html(this.template({}));

			var profile = new PatronModel();
			var fees = new FeeModel();
			fees.fetch();
			fees.save();
			
			profile.fetch().then(function(){
				profile.set("amount", fees.get("amount"));
				if(profile.get("amount")>0){
					alert("Es sind Gebühren fällig");
					console.log("Gebühren:"+profile.get("amount"));
				}
				profile.save();
			});

			
			var profileView = new PatronModelView( {model : profile});
			this.$el.append(profileView.render().el);

			var items = new BookCollection();
			var itemView = new BookCollectionView({collection: items});
			this.$el.append(itemView.render().el);

			this.$el.trigger("create");
			return this;
		}
	});


// LOGIN PAGE VIEW
	app.views.BooksPageLogin = Backbone.View.extend({

		initialize: function(){
			this.template = rendertmpl('login');

		},

		render: function() {
			this.$el.html(this.template({}));
			this.$el.trigger("create");
			return this;
		}
	});



	return app.views.BooksPage;
});