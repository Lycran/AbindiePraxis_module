define([
    "controllers/baseController",
    "pmodules/books/books"
], function(BaseController) {

    return BaseController.extend({
        name: "books",

        default: function () {
            app.loadPage('books', 'index');
        }
    });
});