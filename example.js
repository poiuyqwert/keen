
var keen = require('./keen');

var program = keen.program();

program
	.version('0.1.0')
	.description('CLI parser')
	.optionHelp()
	.optionVersion()
	.commandHelp();

var library = program
	.command('library')
	.alias('l')
	.description('Library functionality')
	.optionHelp()
	.commandHelp();

var options = new keen.Options()
	.option('-v, --verbose', 'Set logging to verbose');

var add = library
	.command('add <type> <names...>')
	.alias('a')
	.argument('names', /[a-zA-Z]+/)
	.description('Add <type> libraries with <names...>')
	.usingOptions(options)
	.option('-p, --priority <level>', 'Priority of libraries added', {parser: keen.parse.int})
	.optionHelp()
	.config(keen.config.allowUnknownOptions, true)
	.config(keen.config.unknownOptionHandler, function(name) {
		return {
			argument: '<value>'
		};
	})
	.action(function(type, names) {
		console.log('add', type, names);
		console.log(this.opts);
		console.log(this.unkOpts);
	});

var remove = library
	.command('remove <names...>')
	.alias('r')
	.description('Remove libraries with names')
	.usingOptions(options)
	.option('-f, --force')
	.optionHelp()
	.action(function(names) {
		console.log('remove', names);
		console.log(this.opts);
	});

var args = program.parse();
// console.log('parse', args);