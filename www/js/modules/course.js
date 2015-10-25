/* global MoodleApp */
define(['jquery',
    'underscore',
    'backbone',
    'utils',
    'moment',
    'modules/calendar.common',
    'modules/moodle.api',
    'modules/localstorage.api',
    'nfc'
], function($, _, Backbone, utils, moment, calendar, moodleAPI, storage, nfcapi) {

  var formProxy = {};
  _.extend(formProxy, Backbone.Events);
  
  var eventProxy = {id:"nothing"};
  
  var link_mapper = {
        map: function(courseName, moodleCourses) {
            var result = [];
            var courseID = $(courseName.split(" "))[0];
            // first check storage
            if (storage.getCourseLink(courseID) != '')
                result.push(storage.getCourseLink(courseID));

            // if nothing found check Moodle
            if (result.length == 0) {
                moodleCourses.filter(function(item) {
                    var candidates = item.get('fullname').split(" ");
                    for (var i = 0; i < candidates.length; i++) {
                        if (candidates[i] != 'Übung' && candidates[i] != 'Praktikum' && candidates[i] != 'Siminar' && candidates[i] != 'Vorlesung') {
                            if (courseName.indexOf(candidates[i]) > -1) {
                                var link = "https://moodle2.uni-potsdam.de/course/view.php?id=" + item.get('id');
                                result.push(link);
                                storage.saveCourseLink(courseID, link);
                                return true;
                            }
                        }
                    }
                });
            }

            return result;
        }
    };

    var handleTag = function(event) {
	    alert(event);
	    eventProxy = event;
            formProxy.trigger("tagRecieved");
        };
   

    var CoursePageView = Backbone.View.extend({
        attributes: {
            "id": "course"
        },


        initialize: function() {

	    formProxy.on('tagRecieved', this.tagRecieved, this);
            //get current courselist
            this.day = new Date();
            this.day = moment(this.day);
            // !!!!!!!!!!!!!!!! only for debugging !!!!!!!!!!!!!!!!!
            // this.day = moment('2015-05-27');
            // !!!!!!!!!!!!!!!! only for debugging !!!!!!!!!!!!!!!!!!
            this.CourseList = new calendar.CourseList();
            this.CourseSlots = new calendar.CourseSlots(undefined, {
                courseList: this.CourseList,
                day: this.day
            });
            this.listenToOnce(this.CourseSlots, 'resetCoursesForDay', this.onCoursesFetched);

            this.CourseList.fetch();

            this.template = utils.rendertmpl('course_loading');
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

        acceptLink: function() {
            var link = $('#inputUrl').val();
            var courseID = $('#courseID').val();
            if (link.indexOf('http://') != -1 || link.indexOf('https://') != -1) {
                storage.saveCourseLink(courseID, link);
            }
        },

        locateGPS: function() {
            navigator.alert("Noch nicht verfügbar.", function() {
                window.history.back();
            }, "Hinweis", "OK");
        },

        locateWlan: function() {
            navigator.alert("Noch nicht verfügbar.", function() {
                window.history.back();
            }, "Hinweis", "OK");
        },

        locateTag: function() {


            this.listenToOnce(this, "waitForTag", this.waitForTag);

            this.trigger("waitForTag");
            return this;
        },

        waitForTag: function() {
            nfc.addTagDiscoveredListener(
               handleTag,
                function() {
                    alert("success.");
                },
                function() {
                    alert("Fail.");
                });

            this.listenToOnce(this, "tagRecieved", this.tagRecieved);
            // this.template = utils.rendertmpl('course_loading');
            // this.render();
        },


        tagRecieved: function() {
	    alert("tag recieved");
	    //not working -,-
	    //nfc.removeTagDiscoveredListener(handleTag,function(){alert("notSuccesful");},function(){alert("error");});
	    this.tagID = eventProxy.tag.id;
            this.template = utils.rendertmpl('course_tagrecieved');
            this.render();
        },

        onCoursesFetched: function(courseList) {
            this.CourseList = courseList;
            this.MoodleCourseList = new window.MoodleApp.CourseList();

            // this.listenToOnce(this.MoodleCourseList,'reset',this.fetchContent);
            // this.MoodleCourseList.fetch();

            this.listenToOnce(this, "authorize", this.authorize);
            this.listenToOnce(this, "fetchContent", this.fetchContent);

            this.trigger("authorize");

        },

        onMoodleFetched: function(result) {
            var currentCourses = this.CourseSlots.findByTimeslot('12:12', '12:13');
            if (currentCourses.length > 0) {
                if (currentCourses.length === 1) {
                    // we have  only one course at this time so we can open the link.
                    this.currentCourseName = currentCourses[0].get('name');
                    var courseLink = link_mapper.map(this.currentCourseName, result);
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
                this.template = utils.rendertmpl('course');

                // this.template = utils.rendertmpl('course_empty');
            }
            this.render();
        },

        authorize: function() {

            //moodleAPI.news_api.set(credentials);
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
            //MoodleApp.news = new MoodleApp.NewsList();
            //$.when(MoodleApp.courses.fetch(), MoodleApp.news.fetch())

            this.LoadingView = new utils.LoadingView({
                collection: MoodleApp.courses,
                el: this.$("#loadingSpinner")
            });
            this.LoadingView.spinnerOn();

            // fetch all necessary information
            MoodleApp.courses.fetch();
            MoodleApp.courses.bind("reset", this.onMoodleFetched, this);
        }
    });

    return CoursePageView;
});