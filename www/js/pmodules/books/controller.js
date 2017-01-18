define([
    "controllers/baseController",
    "pmodules/books/books"
], function(BaseController) {

    return BaseController.extend({
        name: "books",

		login: function () {
			var self = this;
		    app.loadPage('books', 'login', {}, 'slide'); //Zeigt das Hauptmenü an
		},

        default: function () {
            if (app.session.get('up.session.UBauthenticated'))
                app.loadPage('books', 'index');
            else
                app.route('books/login');
        }
    });
});        