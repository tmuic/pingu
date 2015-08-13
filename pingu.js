//  Pingu 1.0-dev
//	https://github.com/jyggen/pingu
//	(c) 2015 Jonas Stendahl
//	Pingu may be freely distributed under the MIT license.

var pingu   = require('./lib/pingu');
var plugins = {
  jira: require('./lib/plugins/jira'),
};

pingu.loadPlugin(plugins.jira);
pingu.listen();
