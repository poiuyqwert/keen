var keen = require('../keen');

describe("Arguments", function() {
	var program;
	beforeEach(function() {
		program = keen.program();
	});

	it('should be accepted', function() {
		var action = createSpy('action');

		program
			.arguments('<a>')
			.action(action);
		program.parse(['a']);

		expect(action).toHaveBeenCalledWith('a');
	});

	it('should allow conditionals', function() {
		var action = createSpy('action');

		program
			.arguments('[a]')
			.action(action);
		program.parse([]);

		expect(action).toHaveBeenCalled();
	});

	it('should allow variadic', function() {
		var action = createSpy('action');

		program
			.arguments('<a...>')
			.action(action);
		program.parse(['a','b']);

		expect(action).toHaveBeenCalledWith(['a','b']);
	});

	it('should allow combinations', function() {
		var action = createSpy('action');

		program
			.arguments('<a> [b] [c...]')
			.action(action);
		program.parse(['a','b','c','d']);

		expect(action).toHaveBeenCalledWith('a', 'b', ['c','d']);
	});

	it('should allow custom parsers', function() {
		var action = createSpy('action');

		program
			.arguments('<a>')
			.argument('a', keen.parse.int)
			.action(action);
		program.parse(['1']);

		expect(action).toHaveBeenCalledWith(1);
	});

	it('should be accessible on `this`', function() {
		var args;

		program
			.arguments('<a> [b] [c...]')
			.action(function() {
				args = this.args;
			});
		program.parse(['a','b','c','d']);

		expect(args).toEqual(['a','b',['c','d']]);
	});

	it('should be returned', function() {
		program
			.arguments('<a> [b] [c...]');

		var args = program.parse(['a','b','c','d']);
		expect(args).toEqual(['a','b',['c','d']]);
	});
});