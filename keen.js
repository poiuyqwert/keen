//   (o)
//   //
// < . >
//  - -

var util = require('util');
var path = require('path');

var KeenError = function() {
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = util.format.apply(util, arguments);
}
util.inherits(KeenError, Error);

var DefaultPrinter = {
	indent: function(str, indent) {
		indent = indent || '  ';
		return indent + str.replace(/\n/, '\n' + indent);
	},
	error: function(error) {
		return 'Error: ' + error.message;
	},
	help: function(command) {
		var help = this.usage(command);
		if (command._commands.length) {
			help += '\n\n' + this.commands(command);
		}
		if (command._options.length) {
			help += '\n\n' + this.options(command);
		}
		return help;
	},
	arguments: function(arguments) {
		var args = '';
		arguments.forEach(function(arg) {
			if (args.length) {
				args += ' ';
			}
			args += arg.toString();
		});
		return args;
	},
	usage: function(command) {
		var usage = 'Usage: ' + command.fullName();
		if (command._options.length) {
			usage += ' [options]';
		}
		if (command._arguments.length) {
			usage += ' ' + this.arguments(command._arguments);
		} else if (command._commands.length) {
			if (command._action) {
				usage += ' [command]';
			} else {
				usage += ' <command>';
			}
		}
		if (command._description) {
			usage += '\n  ' + command._description;
		}
		return usage;
	},
	options: function(command) {
		var options = 'Options:';
		var printer = this;
		command._options.forEach(function(option) {
			options += '\n' + printer.indent(printer.option(option));
		});
		return options;
	},
	option: function(option) {
		var opt = '';
		option.names.forEach(function(name) {
			if (opt.length) {
				opt += ', ';
			}
			opt += name;
		});
		if (option.argument) {
			opt += ' ' + option.argument.toString();
		}
		if (option.description) {
			if (opt.length >= 15) {
				opt += '\n';
				for (var s = 0; s < 15; s++) {
					opt += ' ';
				}
			} else {
				while (opt.length < 15) {
					opt += ' ';
				}
			}
			opt += option.description;
		}
		return opt;
	},
	commands: function(command) {
		var commands = 'Commands:';
		var printer = this;
		command._commands.forEach(function(cmd) {
			commands += '\n' + printer.indent(printer.command(cmd));
		});
		return commands;
	},
	command: function(command) {
		var cmd = this.commandName(command);
		if (command._arguments.length) {
			cmd += ' ' + this.arguments(command._arguments);
		}
		if (command._description) {
			if (cmd.length >= 15) {
				cmd += '\n';
				for (var s = 0; s < 15; s++) {
					cmd += ' ';
				}
			} else {
				while (cmd.length < 15) {
					cmd += ' ';
				}
			}
			cmd += command._description;
		}
		return cmd;
	},
	commandName: function(command) {
		var name = command._name;
		for (var a = 0; a < command._aliases.length; a++) {
			name += '/' + command._aliases[a];
		}
		return name;
	},
	version: function(command) {
		return command._version;
	}
};

var DefaultLogger = {
	out: console.log.bind(console),
	err: console.error.bind(console)
};


var Argument = function(definition, parser) {
	var match = definition.match(/<([a-zA-Z_][a-zA-Z0-9\-_]*)(\.\.\.)?>/);
	if (match) {
		this.literal = false;
		this.required = true;
		this.name = match[1];
		this.variadic = !!match[2];
	} else {
		match = definition.match(/\[([a-zA-Z_][a-zA-Z0-9\-_]*)(\.\.\.)?\]/);
		if (match) {
			this.literal = false;
			this.required = false;
			this.name = match[1];
			this.variadic = !!match[2];
		} else {
			this.literal = true;
			this.required = true;
			this.name = match[1];
			this.variadic = false;
		}
	}
	this._parser = parser;
};
Argument.prototype.toString = function() {
	var result = '';
	if (this.required) {
		result += '<';
	} else if (!this.literal) {
		result += '[';
	}
	result += this.name;
	if (this.variadic) {
		result += '...';
	}
	if (this.required) {
		result += '>';
	} else if (!this.literal) {
		result += ']';
	}
	return result;
};
Argument.prototype.parse = function(value) {
	if (this.parser) {
		if (this.parser instanceof RegExp && !this.parser.test(value)) {
			throw new KeenError("Invalid value '%s' for '%s' argument", value, this.name);
		} else if (!(this.parser instanceof RegExp)) {
			value = this.parser(value);
		}
	}
	return value;
};

var Option = function(definition, description, options) {
	if (typeof options === "undefined" && description !== null && typeof description === "object") {
		description = undefined;
		options = description;
	}
	if (typeof options === "undefined") {
		options = {};
	}
	var pieces = definition.split(/,\s*/);
	this.argument = undefined;
	var option = this;
	this.names = pieces.map(function(piece, index) {
		var name = piece;
		if (index === pieces.length-1) {
			var split = name.split(/\s+/);
			name = split[0];
			if (split.length === 2) {
				option.argument = new Argument(split[1]);
				if ('parser' in options) {
					option.argument.parser = options.parser;
				}
			}
		}
		return name;
	});
	this.description = description || options.description;
	if ('defaultOff' in options) {
		this.defaultOff = options.defaultOff;
	} else {
		this.defaultOff = false;
	}
	if ('defaultOn' in options) {
		this.defaultOn = options.defaultOn;
	} else {
		this.defaultOn = true;
	}
	this.handler = options.handler;
};

var Options = function() {
	this._options = [];
};
Options.prototype.option = function(definition, description, options) {
	var option = new Option(definition, description, options);
	this._options.push(option);
	return this;
};



var Command = function(parent) {
	this._parent = parent;
	this._name = undefined;
	this._aliases = [];
	this._options = [];
	this._optionsMap = {};
	this._arguments = [];
	this._version = undefined;
	this._description = undefined;
	this._commands = [];
	this._commandsMap = {};
	this._action = undefined;
	this._printer = DefaultPrinter;
	this._logger = DefaultLogger;
	this._config = {
		allowUnknownOptions: false,
		enforceOptionParse: true,
		displayHelpOnError: true,
		parseReturns: keen.parseReturns.default
	};

	this.params = {};
	this.opts = {};
	this.unkOpts = {};
	this.args = [];
};
Command.prototype.name = function(name) {
	this._name = name;
	return this;
};
Command.prototype.alias = function(name) {
	if (!this._parent) {
		throw new Error();
	}
	if (name in this._parent._commandsMap) {
		throw new Error();
	}
	this._parent._commandsMap[name] = this;
	this._aliases.push(name);
	return this;
};
Command.prototype.fullName = function() {
	if (this._parent) {
		return this._parent.fullName() + ' ' + this._name;
	}
	return this._name;
};
Command.prototype.version = function(version) {
	this._version = version;
	return this;
};
Command.prototype.description = function(description) {
	this._description = description;
	return this;
};
Command.prototype._addOption = function(option) {
	this._options.push(option);
	var cmd = this;
	option.names.forEach(function(name) {
		cmd._optionsMap[name] = option;
	});
};
Command.prototype.option = function(definition, description, options) {
	var option = new Option(definition, description, options);
	this._addOption(option);
	return this;
};
Command.prototype.usingOptions = function(options) {
	var command = this;
	options._options.forEach(function(option) {
		command._addOption(option);
	});
	return this;
};
Command.prototype.arguments = function(definition) {
	if (this._arguments.length) {
		throw new Error();
	}
	var args = definition.split(/\s+/).map(function(arg) {
		return new Argument(arg);
	});
	var optionals = false;
	for (var a = 0; a < args.length; a++) {
		var arg = args[a];
		if (arg.required && optionals) {
			throw new Error(util.format("Required argument '%s' after optional arguments", arg.name));
		} else if (!arg.required) {
			optionals = true;
		}
		if (arg.variadic && a+1 != args.length) {
			throw new Error(util.format("Variadic argument '%s' must be the last argument", arg.name));
		}
	}
	this._arguments = args;
	return this;
};
Command.prototype.argument = function(name, parser) {
	var a = 0;
	for (; a < this._arguments.length; a++) {
		var argument = this._arguments[a];
		if (argument.name == name) {
			argument.parser = parser;
			break;
		}
	}
	if (a == this._arguments.length) {
		throw new Error(util.format("No argument named '%s'", name));
	}
	return this;
};
Command.prototype.command = function(definition, description, setup) {
	var split = definition.split(/ +/);
	var name = split[0];
	var args = split.slice(1).join(' ');
	if (name in this._commandsMap) {
		throw new Error();
	}

	var command = new Command(this).name(name);
	if (args.length > 1) {
		command.arguments(args);
	}
	if (description) {
		command.description(description);
	}
	if (setup) {
		command.setup(setup);
	}
	this._commands.push(command);
	this._commandsMap[name] = command;
	return command;
};
Command.prototype.setup = function(setup) {
	var args = Array.prototype.slice.call(arguments, 1);
	args.unshift(this);
	setup.apply(undefined, args);
	return this;
};
Command.prototype.action = function(action) {
	this._action = action;
	return this;
};
Command.prototype.config = function(configOrName, undefinedOrValue) {
	if (typeof configOrName === 'string') {
		this._config[configOrName] = undefinedOrValue;
	} else {
		for (var prop in configOrName) {
			if (configOrName.hasOwnProperty(prop)) {
				this._config[prop] = configOrName[prop];
			}
		}
	}
	return this;
};
Command.prototype.handleOption = function(option, name, argv) {
	var oarg = undefined;
	var oargError = undefined;
	if (option.argument && argv.length) {
		try {
			oarg = option.argument.parse(argv[0]);
			argv.shift();
		} catch (e) {
			if (!(e instanceof KeenError)) {
				throw e;
			}
			oarg = undefined;
			oargError = e;
		}
	}
	if (typeof oarg === "undefined") {
		if (option.argument && option.argument.required) {
			if (oargError) {
				throw oargError;
			}
			throw new KeenError("Missing required argument '%s' for option '%s'", option.argument.name, name);
		}
		oarg = option.defaultOn;
	}
	name = name.replace(/^-+/,'');
	if (this._options.indexOf(option) === -1) {
		this.unkOpts[name] = oarg;
	} else {
		this.opts[name] = oarg;
	}
	if (option.handler) {
		return option.handler(oarg);
	}
};
Command.prototype.doParse = function(argv) {
	argv = argv || process.argv.slice(2);
	var a = 0;
	while (argv.length) {
		var arg = argv.shift();
		if (arg in this._optionsMap) {
			if (this.handleOption(this._optionsMap[arg], arg, argv) === keen.BREAK) {
				return;
			}
		} else if (arg in this._commandsMap) {
			return this._commandsMap[arg].parse(argv);
			var cmd = this._commandsMap[arg];
			cmd.parameters(this.params);
			return cmd.parse(argv);
		} else {
			if (arg[0] === '-') {
				if (this._config.allowUnknownOptions) {
					var definition = arg;
					var description = 'Unknown Argument';
					var unkOptions;
					if (this._config.unknownOptionHandler) {
						unkOptions = this._config.unknownOptionHandler.call(this, arg.replace(/^-+/,''));
						if (unkOptions) {
							if ('argument' in unkOptions) {
								definition += ' ' + unkOptions.argument;
							}
							if ('description' in unkOptions) {
								description = unkOptions.description;
							}
						}
					}
					var option = new Option(definition, description, unkOptions);
					if (this.handleOption(option, arg, argv) === keen.BREAK) {
						return;
					}
					continue;
				} else if (this._config.enforceOptionParse) {
					throw new KeenError("Uknown option '%s'", arg);
				}
			}
			if (a >= this._arguments.length) {
				throw new KeenError("Too many arguments");
			}
			var argument = this._arguments[a];
			arg = argument.parse(arg);
			if (argument.variadic) {
				if (this.args.length < this._arguments.length) {
					this.args.push([]);
				}
				this.args[this.args.length-1].push(arg);
			} else {
				this.args.push(arg);
				a += 1;
			}
		}
	}
	if (this.args.length < this._arguments.length && this._arguments[a].required) {
		throw new KeenError("Missing required argument '%s'", this._arguments[a].name);
	}
	if (this._commands.length && !this._action) {
		throw new KeenError("No command chosen");
	}
	var result;
	if (this._action) {
		result = this._action.apply(this, this.args);
	}
	if (this._config.parseReturns === keen.parseReturns.alwaysArgs || (this._config.parseReturns === keen.parseReturns.default && typeof result === 'undefined')) {
		result = this.args;
	}
	return result;
};
Command.prototype.parse = function(args) {
	this.args = [];
	this.opts = {};
	this.unkOpts = {};

	try {
		return this.doParse(args);
	} catch (error) {
		if (!(error instanceof KeenError)) {
			throw error;
		}
		var printer = this._printer || DefaultPrinter;
		this._logger.err(printer.error(error));
		if (this._config.displayHelpOnError) {
			this._logger.out(this.help());
		}
	}
};
Command.prototype.printer = function(printer) {
	this._printer = printer || DefaultPrinter;
	return this;
}
Command.prototype.help = function(printer) {
	printer = printer || this._printer;
	return printer.help(this);
};
Command.prototype.optionHelp = function(definition, description) {
	var command = this;
	this.option(
		definition || '-h, --help',
		description || 'Output usage operation and exit',
		{
			handler: function() {
				command._logger.out(command.help());
				return keen.BREAK;
			}
		}
	);
	return this;
};
Command.prototype.optionVersion = function(definition, description) {
	if (typeof this._version === "undefined") {
		throw new Error("You must set a .version() first");
	}
	var command = this;
	this.option(
		definition || '-v, --version',
		description || 'Output version information and exit',
		{
			handler: function() {
				command._logger.out(command._printer.version(command));
				return keen.BREAK;
			}
		}
	);
	return this;
};
Command.prototype.commandHelp = function(name) {
	name = name || 'help';
	var command = this;
	this.command(name + ' [command]')
		.description('Output usage operation')
		.action(function(cmd) {
			if (typeof cmd !== "undefined" && cmd in command._commandsMap) {
				command = command._commandsMap[cmd];
			}
			command._logger.out(command.help());
		});
	return this;
};
Command.prototype.parameters = function(params) {
	for (var key in params) {
		if (params.hasOwnProperty(key)) {
			this.params[key] = params[key];
		}
	}
	return this;
};

var keen = {
	KeenError: KeenError,
	DefaultPrinter: DefaultPrinter,
	DefaultLogger: DefaultLogger,
	Options: Options,
	program: function(name) {
		name = name || path.basename(process.argv[1], '.js');
		return new Command().name(name);
	},
	parse: {
		int: function(str) {
			var val = parseInt(str); // Need better int parsing/validation?
			if (isNaN(val)) {
				throw new KeenError("Value '%s' is not an integer", str);
			}
			return val;
		},
		float: function(str) {
			var val = parseFloat(str); // Need better float parsing/validation?
			if (isNaN(val)) {
				throw new KeenError("Value '%s' is not a float", str);
			}
			return val;
		}
	},
	BREAK: "break",
	config: {
		allowUnknownOptions: 'allowUnknownOptions', // Collect unknown options instead of throwing an error
		unknownOptionHandler: 'unknownOptionHandler', // Allows you to throw errors, provide an argument definition, description, and/or options for unknown options
		enforceOptionParse: 'enforceOptionParse', // If allowUnknownOptions is unset, disabling this will passthrough unknown options as arguments 
		displayHelpOnError: 'displayHelpOnError', // Display help if a KeenError is thrown
		parseReturns: 'parseReturns', // Determine what is returned from the parse function (valid settings are in keen.parseReturns)
	},
	parseReturns: {
		default: 'default', // Return args if action returns undefined, otherwise return action result
		alwaysArgs: 'alwaysArgs', // Always returns args, ignores action result
		alwaysActionResult: 'alwaysActionResult', // Always return action result, even if undefined
	}
};

module.exports = keen;
