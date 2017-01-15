define([
    "controllers/baseController",
    "pmodules/books/books"
], function(BaseController) {

    return BaseController.extend({
        name: "books",



		logout: function () {
			var self = this;
			app.loadPage('books', 'logout', {}, 'slide'); //Zeigt das Hauptmenü an
		},

		login: function () {
			var self = this;
		    app.loadPage('books', 'login', {}, 'slide'); //Zeigt das Hauptmenü an
		},

//         default: function () {
//             if (app.session.get('up.session.authenticated'))
//                 app.route('books/logout');
//             else
//                 app.route('books/login');
//         }
//     });
// });






        default: function () {
            app.loadPage('books', 'index');
        }
    });
});





        