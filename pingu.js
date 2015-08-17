//  Pingu 1.0-dev
//	https://github.com/jyggen/pingu
//	(c) 2015 Jonas Stendahl
//	Pingu may be freely distributed under the MIT license.

var pingu   = require('./lib/pingu');
var plugins = {
  jira: require('./lib/plugins/jira'),
  mention: require('./lib/plugins/mention'),
};

pingu.loadPlugin(plugins.jira);
pingu.loadPlugin(plugins.mention);
pingu.listen();
