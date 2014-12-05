window.OpenBoards = Ember.Application.create({
});

OpenBoards.use_push_state = !!(window.history && window.history.pushState);
if(location.pathname.match(/^\/jasmine/)) {
  OpenBoards.use_push_state = false;
} else if(window.navigator.standalone) {
  OpenBoards.use_push_state = false;
} else if(false) { // TODO: check if full screen launch on android
  OpenBoards.use_push_state = false;
}
if (OpenBoards.use_push_state) {
  OpenBoards.Router.reopen({
    location: 'history'
  });
} 

OpenBoards.Router.reopen({
  notifyGoogleAnalytics: function() {
    if(window.ga) {
      return window.ga('send', 'pageview', {
        'page': this.get('url'),
        'title': this.get('url')
      });
    }
  }.on('didTransition')
});


// router
OpenBoards.Router.map(function () {
  this.route('index', { path: '/' });
  this.route('docs', { path: '/docs' });
  this.route('examples', { path: '/examples' });
  this.route('tools', { path: '/tools' });
  this.route('share', { path: '/share' });
});

OpenBoards.ApplicationRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    modal.setup(this);
  }
});

OpenBoards.ApplicationView = Ember.View.extend({
  didInsertElement: function() {
//    debugger
  }
});

OpenBoards.ApplicationController = Ember.Controller.extend({
  root_url: function() {
    return location.origin + "/";
  }.property(''),
  escaped_root_url: function() {
    return encodeURIComponent(this.get('root_url'));
  }.property('root_url')
});

var promise_ajax = function(options) {
  return new Ember.RSVP.Promise(function(resolve, reject) {
    options.success = function(data) {
      resolve(data);
    };
    options.error = function(data) {
      reject(data);
    }
    options.data = options.data || {};
    options.data.authenticity_token = AUTH_TOKEN;
    Ember.$.ajax(options);
  });
};

OpenBoards.ToolsController = Ember.Controller.extend({
  bad_validate_file: function() {
    return !this.get('validate_file');
  }.property('validate_file'),
  bad_convert_file: function() {
    return !this.get('convert_file');
  }.property('convert_file'),
  bad_preview_file: function() {
    return !this.get('preview_file');
  }.property('preview_file'),
  bad_translate_file: function() {
    return true; //!this.get('translate_file');
  }.property('translate_file'),
  actions: {
    validate_file: function() {
      modal.open('loading-status', {type: 'validate'});
    },
    preview_file: function() {
      modal.open('loading-status', {type: 'preview'});
    },
    convert_file: function() {
      modal.open('loading-status', {type: 'convert'});
    }
  }
});

OpenBoards.LoadingStatusView = Ember.ModalView;
OpenBoards.LoadingStatusController = Ember.ModalController.extend({
  toggle_width: function() {
    if(this.get('validation_results')) {
      Ember.$("#modal .modal-dialog").css('width', '80%');
    } else {
      Ember.$("#modal .modal-dialog").css('width', '');
    }
  }.observes('validation_results'),
  opening: function(settings) {
    if(settings.type == 'preview') {
      this.preview_file();
    } else if(settings.type == 'convert') {
      this.convert_file();
    } else if(settings.type == 'validate') {
      this.validate_file();
    } else {
      console.debug("modal type not found");
      modal.close();
    }
  },
  preview_file: function() {
    this.set('header', i18n.t('file_preview', "File Preview"));
    this.set('loader', i18n.t('generating_preview', "Generating PDF Preview..."));
    var file = Ember.$("#preview_file")[0].files[0];
    var _this = this;
    
    var upload = _this.upload_file(file);
    
    var convert = upload.then(function(data) {
      return promise_ajax({
        url: "/converter/convert",
        type: "POST",
        data: {
          url: data.url,
          type: 'pdf'
        }
      }).then(function(data) {
        return _this.watch_for_progress(data);
      });
    });
    
    convert.then(function(data) {
      _this.set('download_url', data);
    }, function(err) {
      _this.set('error', err.error);
    });
  },
  convert_file: function() {
    this.set('header', i18n.t('file_conversion', "File Conversion"));
    this.set('loader', i18n.t('generating_obf_file', "Generating OBF/OBZ File..."));
    var file = Ember.$("#convert_file")[0].files[0];
    var _this = this;
    
    var upload = _this.upload_file(file);
    
    var convert = upload.then(function(data) {
      return promise_ajax({
        url: "/converter/convert",
        type: "POST",
        data: {
          url: data.url,
          type: 'obf'
        }
      }).then(function(data) {
        return _this.watch_for_progress(data);
      });
    });
    
    convert.then(function(data) {
      _this.set('download_url', data);
    }, function(err) {
      _this.set('error', err.error);
    });
  },
  validate_file: function() {
    this.set('header', i18n.t('file_validation', "File Validation"));
    this.set('loader', i18n.t('validating_file', "Validating OBF File..."));
    var file = Ember.$("#validate_file")[0].files[0];
    var _this = this;
    
    var upload = _this.upload_file(file);
    
    var convert = upload.then(function(data) {
      return promise_ajax({
        url: "/converter/validate",
        type: "POST",
        data: {
          url: data.url,
          type: 'obf'
        }
      }).then(function(data) {
        return _this.watch_for_progress(data);
      });
    });
    
    convert.then(function(data) {
      _this.set('validation_results', data);
    }, function(err) {
      _this.set('error', err.error);
    });
  },
  upload_file: function(file) {
    var _this = this;
    var read = _this.read_file(file);
    
    var upload_prep = read.then(function(data) {
      var data_uri = data.target.result;
      return promise_ajax({
        url: "/converter/upload_params",
        type: "POST",
        data: {
          filename: file.name,
          content_type: file.type,
          size: file.size
        }
      }).then(function(params) {
        params.data_url = data_uri;
        params.content_type = file.type;
        return Ember.RSVP.resolve(params);
      }, function() {
        return Ember.RSVP.reject({error: "upload initialization failed"});
      });
    });
    
    var upload = upload_prep.then(function(params) {
      return _this.upload_to_remote(params).then(function() {
        return {
          url: params.full_url,
          content_type: params.content_type
        };
      });
    });
    
    return upload;
  },
  upload_to_remote: function(params) {
    var _this = this;
    var promise = new Ember.RSVP.Promise(function(resolve, reject) {
      var fd = new FormData();
      for(var idx in params.upload_params) {
        fd.append(idx, params.upload_params[idx]);
      }
      fd.append('file', _this.data_uri_to_blob(params.data_url));
    
      promise_ajax({
        url: params.upload_url,
        type: 'POST',
        data: fd,
        processData: false,  // tell jQuery not to process the data
        contentType: false   // tell jQuery not to set contentType
      }).then(function(data) {
        resolve(data);
      }, function(err) {
        debugger
        reject({error: "upload failed"});
      });
    });
    return promise;
  },
  data_uri_to_blob: function(data_uri) {
    var pre = data_uri.split(/;/)[0];
    var type = pre.split(/:/)[1];
    var binary = atob(data_uri.split(',')[1]);
    var array = [];
    for(var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {type: type});
  },
  read_file: function(file) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var reader = new FileReader();
      var _this = this;
      reader.onload = function(data) {
        Ember.run(function() {
          resolve(data);
        });
      };
      reader.readAsDataURL(file);
    });
  },
  watch_for_progress: function(progress) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var errors = 0;
      var ping = function() {
        promise_ajax({
          url: "/converter/status?code=" + progress.code,
          type: "GET"
        }).then(function(data) {
          errors = 0;
          if(data.status == 'pending') {
            Ember.run.later(ping, 3000);
          } else if(data.status == 'finished') {
            resolve(data.result);
          } else if(data.status == 'errored') {
            reject({error: "processing failed"});
          }
        }, function() {
          errors++;
          if(errors > 3) {
            reject({error: "status check failed"});
          } else {
            Ember.run.later(ping, 3000);
          }
        });
      };
      Ember.run.later(ping, 3000);
    });
  }
});