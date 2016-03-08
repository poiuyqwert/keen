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

	it('should allow parameters', function() {
		var params;

		program
			.parameters({a: 'b'})
			.action(function() {
				params = this.params;
			});
		program.parse([]);

		expect(params).toEqual({a: 'b'});
	});

	it('should forward parameters to sub-commands', function() {
		var params;

		program
			.parameters({a: 'b'})
			.command('c')
			.action(function() {
				params = this.params;
			});
		program.parse(['c']);

		expect(params).toEqual({a: 'b'});
	});

	describe('when configured to always call action before sub-commands', function() {
		beforeEach(function() {
			program
				.config(keen.config.alwaysCallAction, true);
		});

		it('should call action before sub-commands', function() {
			var calls = [];

			program
				.action(function() {
					calls.push(1);
				})
				.command('a')
				.action(function() {
					calls.push(2);
				});
			program.parse(['a']);

			expect(calls).toEqual([1,2]);
		});

		it('should allow arguments before sub-commands', function() {
			var action1 = createSpy('action1');
			var action2 = createSpy('action2');

			program
				.arguments('<a>')
				.action(action1)
				.command('b <c>')
				.action(action2);
			program.parse(['a','b','c']);

			expect(action1).toHaveBeenCalledWith('a');
			expect(action2).toHaveBeenCalledWith('c');
		});
	});
});