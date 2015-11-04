/* global MoodleApp */
define(['jquery',
    'underscore',
    'backbone',
    'utils',
    'moment',
    'modules/calendar.common',
    'modules/moodle.api',
    'modules/moodle.utils',
    'nfc', // not directly accessed but needed for instanciation
    'modules/iddb'
], function($, _, Backbone, utils, moment, calendar, moodleAPI, moodleUtils, nfcapi, iddb) {

    ///////////////////////////////////////
    //     Form and event eventProxy     //
    ///////////////////////////////////////
    var formProxy = {};
    var eventProxy = {
        id: "nothing"
    };
    _.extend(formProxy, Backbone.Events);

    var onTagDiscovered = function(event) {
        eventProxy = event;
        formProxy.trigger("tagRecieved");
    };

    var CoursePageView = Backbone.View.extend({
        attributes: {
            "id": "course"
        },

        initialize: function() {

            // register event on formProxy
            formProxy.on('tagRecieved', this.tagRecieved, this);

            //get current courselist
            this.day = new Date();
            this.day = moment(this.day);

            // !!!!!!!!!!!!!!!! only for debugging !!!!!!!!!!!!!!!!!
            // this.day = moment('2015-05-27');
            // !!!!!!!!!!!!!!!! only for debugging !!!!!!!!!!!!!!!!!!

            //fetch calender course list
            this.CourseList = new calendar.CourseList();
            this.CourseSlots = new calendar.CourseSlots(undefined, {
                courseList: this.CourseList,
                day: this.day
            });

            this.listenToOnce(this.CourseSlots, 'resetCoursesForDay', this.onCoursesFetched);

            this.template = utils.rendertmpl('course_loading');

            this.CourseList.fetch();

        },

        events: {
            'click .gps': 'locateGPS',
            'click .wlan': 'locateWlan',
            'click .tag': 'locateTag',
            'click .OK': 'acceptLink'
        },

        render: function() {
            $(this.el).html(this.template({
                currentCourseName: this.currentCourseName,
                currentCourseID: this.currentCourseID,
                tagID: this.tagID
            }));
            return this;
        },

        /**
         * Called when custom link is entered by user.
         */
        acceptLink: function() {
            var link = $('#inputUrl').val();
            var courseID = $('#courseID').val();
            if (link.indexOf('http://') != -1 || link.indexOf('https://') != -1) {
                storage.saveCourseLink(courseID, link);
            }
        },

        locateGPS: function() {
            alert("Noch nicht verfügbar.");
        },

        locateWlan: function() {
            alert("Noch nicht verfügbar.");
        },
	
	
	///////////////////////////////////////
	//          Tag handling             //
	///////////////////////////////////////

        locateTag: function() {

            this.listenToOnce(this, "waitForTag", this.waitForTag);
            this.trigger("waitForTag");
        },

        waitForTag: function() {
            nfc.addTagDiscoveredListener(
                onTagDiscovered,
                function() {},
                function() {
                    alert("NFC Modul konnte nicht aktiviert werden.");
                });

            this.listenToOnce(this, "tagRecieved", this.tagRecieved);
            this.template = utils.rendertmpl('course_scantag');
            this.render();
        },


        tagRecieved: function() {
            //not working -,-
            //nfc.removeTagDiscoveredListener(onTagDiscovered,function(){alert("notSuccesful");},function(){alert("error");});
            this.tagID = eventProxy.tag.id;
            alert(this.tagID);
            var iddbModel = new iddb({
                id: this.tagID
            });
            iddbModel.on('sync', this.onIddbFetched, this);
            iddbModel.fetch();
            this.render();
        },

        onIddbFetched: function(result) {
            var room = result.get("room");
            alert(room);
            var matchingCourse = this.currentCourses.filter(function(item) {
                var roomFromCalender = item.get('room');
                if (item == roomFromCalender)
                    return true;
                else
                    return false;
            });
            alert(matchingCourse);
            this.currentCourseName = currentCourses[0].get('name');
            var courseLink = moodleUtils.getCourseLinkByCourseName(this.currentCourseName, result);

            if (courseLink.length > 0) {
                window.open(courseLink[0], '_system');
            } else {
                this.template = utils.rendertmpl('course_nolink');
            }
        },

	///////////////////////////////////////
	//     Fetch calender and moodle     //
	///////////////////////////////////////
        onCoursesFetched: function(courseList) {

            // calender curses fetched. Now get moodle courses.
            this.MoodleCourseList = new window.MoodleApp.CourseList();
            this.listenToOnce(this, "authorize", this.authorize);
            this.listenToOnce(this, "fetchContent", this.fetchContent);

            this.trigger("authorize");

        },

        authorize: function() {

            var that = this;

            $.when(moodleAPI.api.fetchUserid()).done(function() {
                // moodleAPI.api should be authorized and has userId, moodleAPI.news_api should be authorized
                that.trigger("fetchContent");
            }).fail(function(error) {
                var errorPage = new utils.ErrorView({
                    el: '#courselist',
                    msg: 'Fehler beim Abruf der Kurse. Bitte loggen Sie sich erneut ein.',
                    module: 'moodle',
                    err: error
                });
            });
        },

        fetchContent: function() {
            MoodleApp.courses = new window.MoodleApp.CourseList();

            // fetch all necessary information
            MoodleApp.courses.fetch();
            MoodleApp.courses.bind("reset", this.onMoodleFetched, this);
        },

        onMoodleFetched: function(result) {
            this.currentCourses = this.CourseSlots.findByTimeslot('12:12', '12:13');

            if (this.currentCourses.length > 0) {
                if (this.currentCourses.length === 1) {

                    // we have  only one course at this time so we can open the link.
                    this.currentCourseName = currentCourses[0].get('name');
                    var courseLink = moodleUtils.getCourseLinkByCourseName(this.currentCourseName, result);
                    this.currentCourseID = this.currentCourseName.split(" ")[0];

                    if (courseLink.length > 0) {
                        window.open(courseLink[0], '_system');
                    } else {
                        this.template = utils.rendertmpl('course_nolink');
                    }
                } else {
                    // we have more than one course at this time open locator view
                    this.template = utils.rendertmpl('course');
                }
            } else {
                
                //TODO debuging purpose
                this.template = utils.rendertmpl('course');

                //TODO original
                // this.template = utils.rendertmpl('course_empty');
            }
            this.render();
        }
    });

    return CoursePageView;
});