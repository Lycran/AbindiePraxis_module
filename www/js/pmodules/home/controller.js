define([
    "controllers/baseController",
    "pmodules/home/home"
], function(BaseController) {

    return BaseController.extend({
        name: "main",

        /**
         * Zeigt das Hauptmen� an
         */
        menu: function () {
            var self = this;
            app.loadPage(this.name, 'menu', {}, '-slide'); //Zeigt das Hauptmen� an
        }
    });
});