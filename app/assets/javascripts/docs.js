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

var watch_for_progress = function(progress) {
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
  this.route('logs', { path: '/logs' });
  this.route('examples', { path: '/examples' });
  this.route('tools', { path: '/tools' });
  this.route('analyze', { path: '/analyze' });
  this.route('share', { path: '/share' });
  this.route('partners', { path: '/partners' });
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
  index_route: function() {
    return this.get('currentPath') == 'index';
  }.property('currentPath'),
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
  bad_analyze_file: function() {
    return !this.get('analyze_file') && !this.get('analyze_url');
  }.property('analyze_file', 'analyze_url'),
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
    analyze_file: function() {
      modal.open('loading-status', {type: 'analyze'});
    },
    preview_file: function() {
      modal.open('loading-status', {type: 'preview'});
    },
    convert_file: function() {
      modal.open('loading-status', {type: 'convert'});
    }
  }
});

OpenBoards.DocsController = Ember.Controller.extend({
  board_view: function() {
    return this.get('current_view') != 'logs';
  }.property('current_view'),
  actions: {
    show_view: function(view) {
      this.set('current_view', view);
    }
  }
});

OpenBoards.AnalyzeController = Ember.Controller.extend({
  list_url: function() {
    var parts = location.search.replace(/^\?/, '').split(/\&/);
    var hash = {};
    parts.forEach(function(str) {
      var pieces = str.split(/\=/);
      hash[decodeURIComponent(pieces[0])]  = decodeURIComponent(pieces[1]);
    });
    return hash.url;
  },
  known_names: function() {
    return {
      "l84f":"LAMP Words For Life 84",
      "qc24":"Quick Core 24",
      "qc60":"Quick Core 60",
      "qc112":"Quick Core 112",
      "sfy":"Speak For Yourself",
      "wp108":"WordPower 108",
      "wp80":"WordPower 80",
    };
  },
  vocab_name: function() {
    var hash = this.known_names() || {};
    if(hash[this.list_url()]) {
      return hash[this.list_url()];
    } else {
      return "Custom Vocabulary";
    }
  }.property(''),
  comp_name: function() {
    var hash = this.known_names() || {};
    if(this.get('comp') && hash[this.get('comp')]) {
      return hash[this.get('comp')];
    } else {
      return "Comparison Vocabulary";
    }
  }.property('comp'),
  // query param url, prompt for comparison if any, submit button
  // warning that data will only hang around for a week or whatever
  // NOTE you can set url=prefix to check a preloaded obfset
  process: function(comp) {
    this.set('comp', comp);
    var _this = this;
    _this.set('results', {loading: true});
    var list_url = this.list_url();
    if(list_url) {
      var analyze = promise_ajax({
        url: "/converter/analyze",
        type: "POST",
        data: {
          url: list_url,
          comp: comp
        }
      }).then(function(data) {
        return watch_for_progress(data);
      });
  
      analyze.then(function(data) {
        console.log("ANALYIS COMPLETE", data);
        _this.set('results', data);
      }, function(err) {
        _this.set('results', {error: true});
      });  
    }
  },
  missing: function() {
    var missing = this.get('results.missing');
    if(missing) {
      var res = [];
      for(var key in missing) {
        res.push(missing[key]);
      }
      return res;
    }
  }.property('results.missing'),
  cores: function() {
    var cores = this.get('results.cores');
    if(cores) {
      var res = [];
      for(var key in cores) {
        res.push({
          name: cores[key].name,
          list: cores[key].list,
          average_effort: Math.round(cores[key].average_effort * 100.0) / 100.0,
          comp_effort: Math.round(cores[key].comp_effort * 100.0) / 100.0
        });
      }
      return res;
    }
  }.property('results.cores'),
  levels: function() {
    var levels = this.get('results.levels');
    if(levels) {
      var res = [];
      for(var n in levels) {
        var lvl = parseInt(n, 10);
        res.push({
          level: lvl + 1,
          plural: lvl > 0,
          buttons: levels[n]
        });
      }
      return res;
    }
  }.property('results.levels'),
  actions: {
    analyze: function() {
      var comp = $("#comp").val();
      this.process(comp);
    },
    raw_list: function(type) {
      var comp = $("#comp").val();
      if(type == 'list') {
        comp = this.list_url();
      }
      if(comp && comp != 'none') {
        window.open("/words?list=" + encodeURIComponent(comp), '_blank')
      }
    },
    weighted_list: function(type) {
      var comp = $("#comp").val();
      if(type == 'list') {
        comp = this.list_url();
      }
      if(comp && comp != 'none') {
        window.open("/words?weights=1&list=" + encodeURIComponent(comp), '_blank')
      }
    }
  }
});

OpenBoards.LogsController = Ember.Controller.extend({
});

OpenBoards.ExamplesController = Ember.Controller.extend({
  boards: function() {
    return [
      {
        name: "CommuniKate 20",
        url: "https://openboards.s3.amazonaws.com/examples/communikate-20.obz",
        license: "CC-By NC-SA",
        license_url: "http://creativecommons.org/licenses/by-nc-sa/3.0/",
        preview_url: "https://app.mycoughdrop.com/kate-mccallum/communikate-top-page?embed=1",
        pdf_url: "https://openboards.s3.amazonaws.com/examples/communikate-20.obz.pdf",
        size: 13,
        author: "Kate McCallum",
        image_url: "/previews/communikate-20.png",
        description: "CommuniKate 20 is a functional communication board with 20 buttons per board created by Kate McCallum for the adult population of communicators that she serves."
      },
      {
        name: "CommuniKate 12",
        url: "https://openboards.s3.amazonaws.com/examples/ck12.obz",
        license: "CC-By NC-SA",
        license_url: "http://creativecommons.org/licenses/by-nc-sa/3.0/",
        preview_url: "https://app.mycoughdrop.com/kate-mccallum/communikate-toppage?embed=1",
        pdf_url: "https://openboards.s3.amazonaws.com/examples/ck12.obz.pdf",
        size: 12,
        author: "Kate McCallum",
        image_url: "/previews/communikate-12.png",
        description: "CommuniKate 12 is a smaller version of CommuniKate 20, it has only 12 buttons per board but offers the same style of layout and functional style of communication."
      },
      {
        name: "Project Core",
        url: "https://openboards.s3.amazonaws.com/examples/project-core.obf",
        license: "CC-By",
        preview_url: "https://app.mycoughdrop.com/wahlquist/_36-universal-universal-core-2017-by-the-clds-project-core?embed=1",
        pdf_url: "",
        size: 10,
        author: "UNC Chapel Hill",
        image_url: "/previews/project-core.png",
        description: "Project core is a research-based initiative to ensure all communicators have at least one option for beginning core-base communication."
      },
      {
        name: "Quick Core 24",
        url: "https://openboards.s3.amazonaws.com/examples/quick-core-24.obz",
        license: "CC-By",
        license_url: "http://creativecommons.org/licenses/by-nc-sa/3.0/",
        preview_url: "https://app.mycoughdrop.com/example/core-24?embed=1",
        pdf_url: "",
        size: 10,
        author: "CoughDrop",
        image_url: "/previews/quick-core-24.png",
        description: "Quick Core 24 is a core, motor-planning based vocabulary set with up to 24 buttons per board. It has built-in progression to gradually expand the vocabulary over time."
      },
      {
        name: "Quick Core 60",
        url: "https://openboards.s3.amazonaws.com/examples/quick-core-60.obz",
        license: "CC-By",
        preview_url: "https://app.mycoughdrop.com/example/core-60?embed=1",
        pdf_url: "",
        size: 10,
        author: "CoughDrop",
        image_url: "/previews/quick-core-60.png",
        description: "Quick Core 60 is a core, motor-planning based vocabulary set with up to 60 buttons per board. It has built-in progression to gradually expand the vocabulary over time."
      },
      {
        name: "Quick Core 112",
        url: "https://openboards.s3.amazonaws.com/examples/quick-core-112.obz",
        license: "CC-By",
        preview_url: "https://app.mycoughdrop.com/example/core-112?embed=1",
        pdf_url: "",
        size: 10,
        author: "CoughDrop",
        image_url: "/previews/quick-core-112.png",
        description: "Quick Core 112 is a core, motor-planning based vocabulary set with up to 112 buttons per board. It has built-in progression to gradually expand the vocabulary over time."
      }
    ];
  }.property(),
  actions: {
    show_view: function(view) {
      this.set('current_view', view);
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
    } else if(settings.type == 'analyze') {
      this.analyze_file();
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
  analyze_file: function() {
    this.set('header', i18n.t('vocabulary_analysis', "Vocabulary Analysis"));
    this.set('loader', i18n.t('generating_results', "Generating Results..."));
    var file = Ember.$("#analyze_file")[0].files[0];
    var url = Ember.$("#analyze_url").val();
    var _this = this;

    var analyze = null;
    if(url) {
      analyze = promise_ajax({
        url: "/converter/obfset",
        type: "POST",
        data: {
          url: url,
          type: 'url'
        }
      }).then(function(data) {
        return _this.watch_for_progress(data);
      });
    } else if(file) {
      var upload = _this.upload_file(file);
      var analyze = upload.then(function(data) {
        return promise_ajax({
          url: "/converter/obfset",
          type: "POST",
          data: {
            url: data.url,
            type: 'upload'
          }
        }).then(function(data) {
          return _this.watch_for_progress(data);
        });
      });
        
    }
    
    analyze.then(function(data) {
      location.href = "/analyze?url=" + encodeURIComponent(data);
      // redirect to wherever the results are being housed
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
      _this.set('validation_results', Ember.Object.create(data));
    }, function(err) {
      _this.set('error', err.error);
    });
  },
  general_results_valid: function() {
    var results = this.get('validation_results.results') || [];
    var all_valid = true;
    results.forEach(function(r) {
      if(!r.valid) {
        all_valid = false;
      }
    });
    return all_valid;
  }.property('validation_results.results'),
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
    return watch_for_progress(progress);
  },
  actions: {
    toggle: function(result) {
      if(!result) {
        result = this.get('validation_results');
      }
      Ember.set(result, 'toggled', !Ember.get(result, 'toggled'));
    }
  }
});