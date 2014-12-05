var modal = Ember.Object.extend({
  setup: function(route) {
    if(this.last_promise) { this.last_promise.reject(); }
    this.route = route;
    this.settings_for = {};
  },
  open: function(template, options) {
    if(this.last_promise || this.last_template) {
      this.close();
    }
    if(!this.route) { throw "must call setup first"; }
    
    this.settings_for[template] = options;
    this.last_template = template;
    this.route.render(template, { into: 'application', outlet: 'modal'});
    var _this = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      _this.last_promise = {
        resolve: resolve,
        reject: reject
      };
    });
  },
  is_open: function(template) {
    if(template) {
      return this.last_template == template;
    } else {
      return !!this.last_template;
    }
  },
  close: function(success) {
    if(!this.route) { return; }
    if(this.last_promise) { 
      if(success || success === undefined) {
        this.last_promise.resolve(); 
      } else {
        this.last_promise.reject(); 
      }
      this.last_promise = null;
    }
    this.last_template = null;
    this.route.disconnectOutlet({
      outlet: 'modal',
      parentView: 'application'
    });
  }
}).create();

Ember.ModalView = Ember.View.extend({
  willInsertElement: function() {
    var template = this.get('templateName') || this.get('renderedName');
    var settings = modal.settings_for[template] || {};
    var controller = this.get('controller');
    controller.set('model', settings);
    if(controller.opening) {
      controller.opening(settings);
    }
  },
  willDestroyElement: function() {
    var controller = this.get('controller');
    if(controller.closing) {
      controller.closing();
    }
  }
});
Ember.ModalController = Ember.ObjectController.extend({
  opening: function() {
  },
  closing: function() {
  },
  actions: {
    close: function() {
      modal.close();
    }
  }
});