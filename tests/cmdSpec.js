var keen = require('../keen');

describe("Commands", function() {
	var program;
	beforeEach(function() {
		program = keen.program();
	});

	it('should be accepted', function() {
		var action = createSpy('action');

		program
			.command('a')
			.action(action);
		program.parse(['a']);

		expect(action).toHaveBeenCalled();
	});

	it('should be nestable', function() {
		var action = createSpy('action');

		program
			.command('a')
			.command('b')
			.command('c')
			.action(action);
		program.parse(['a','b','c']);

		expect(action).toHaveBeenCalled();
	});

	it('should allow siblings', function() {
		var action = createSpy('action');

		program
			.command('a');
		program
			.command('b')
			.action(action);
		program.parse(['b']);

		expect(action).toHaveBeenCalled();
	});

	it('should allow aliases', function() {
		var action = createSpy('action');

		program
			.command('a')
			.alias('b')
			.action(action);
		program.parse(['b']);

		expect(action).toHaveBeenCalled();
	});
});