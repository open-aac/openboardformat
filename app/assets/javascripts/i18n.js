Ember.Handlebars.registerBoundHelper('date', function(date) {
  if(arguments.length == 1) {
    date = new Date();
  }
  return moment(date).format('MMMM Do YYYY, h:mm a');
});
Ember.Handlebars.registerBoundHelper('date_ago', function(date) {
  return moment(date).fromNow();
});
Ember.Handlebars.registerBoundHelper('seconds_ago', function(seconds) {
  if(!seconds || seconds < 0) {
    return "";
  } else if(seconds < 60) {
    return i18n.t('seconds_ago', "second", {hash: {count: seconds}});
  } else if(seconds < 3600) {
    var minutes = Math.round(seconds / 60 * 10) / 10;
    return i18n.t('minutes_ago', "minute", {hash: {count: minutes}});
  } else {
    var hours = Math.round(seconds / 3600 * 10) / 10;
    return i18n.t('hours_ago', "hour", {hash: {count: hours}});
  }
});
Ember.Handlebars.registerBoundHelper('round', function(number) {
  return Math.round(number * 100) / 100;
});
Ember.Handlebars.registerBoundHelper('t', function(str, options) {
  return new Ember.Handlebars.SafeString(i18n.t(options.key, str, options));
});
Ember.Handlebars.registerBoundHelper('count', function(str, options) {
  if(str == 1 && options.hash && options.hash.singular) {
    return new Ember.Handlebars.SafeString(i18n.t(options.hash.key, str + " " + options.hash.singular));
  } else if(str != 1 && options.hash && options.hash.plural) {
    return new Ember.Handlebars.SafeString(i18n.t(options.hash.key + '_plural', str + " " + options.hash.plural));
  } else {
    return new Ember.Handlebars.SafeString(str);
  }
});
Ember.Handlebars.registerBoundHelper('size', function(str, options) {
  var i = -1;
  var fileSizeInBytes = parseFloat(str)
  var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
  do {
      fileSizeInBytes = fileSizeInBytes / 1024;
      i++;
  } while (fileSizeInBytes > 1024);

  return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];  
});
var i18n = Ember.Object.extend({
  init: function() {
    this._super();
    for(var idx in this.substitutions) {
      var replaces = {};
      for(var jdx in this.substitutions[idx]) {
        for(var kdx in this.substitutions[idx][jdx]) {
          replaces[kdx] = jdx;
        }
      }
      this.substitutions[idx].replacements = replaces;
    }
  },
  t: function(key, str, options) {
    var terms = str.match(/%{(\w+)}/);
    for(var idx = 0; terms && idx < terms.length; idx+= 2) {
      var word = terms[idx + 1];
      if(options[word]) {
        var value = options[word];
        str = str.replace(terms[idx], value);
      } else if(options.hash && options.hash[word]) {
        var value = options.hash[word];
        if(options.hashTypes[word] == 'ID') {
          value = Ember.get(options.hashContexts[word], options.hash[word].toString());
          value = value || options.hash[word];
        }
        str = str.replace(terms[idx], value);
      }
    }
    
    return str;
  }
}).create();