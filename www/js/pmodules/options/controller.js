define([
    "controllers/baseController",
    "pmodules/options/options"
], function(BaseController) {

    return BaseController.extend({
        name: "options",

        logout: function () {
            var self = this;
            app.loadPage('options', 'logout', {}, 'slide'); //Zeigt das Hauptmen� an
        },

        login: function () {
            var self = this;
            app.loadPage('options', 'login', {}, 'slide'); //Zeigt das Hauptmen� an
        },

        default: function () {
            if (app.session.get('up.session.authenticated'))
                app.route('options/logout');
            else
                app.route('options/login');
        }
    });
});