var keen = require('../keen');

describe("Options", function() {
	it('should be accepted', function() {
		var program = keen.program()
			.option('--opt');
		program.parse(['--opt']);

		expect(program.opts.opt).toEqual(true);
	});

	it('should allow an argument', function() {
		var program = keen.program()
			.option('--opt <a>');
		program.parse(['--opt','a']);

		expect(program.opts.opt).toEqual('a');
	});

	it('should allow an option argument', function() {
		var program = keen.program()
			.option('--opt [a]');
		program.parse(['--opt']);

		expect(program.opts.opt).toEqual(true);
	});

	it('should allow custom default values', function() {
		var program = keen.program()
			.option('--opt [a]', '', {defaultOn: 'a'});
		program.parse(['--opt']);

		expect(program.opts.opt).toEqual('a');
	});

	describe('when configured', function() {
		it('should allow unknowns', function() {
			var program = keen.program()
				.config(keen.config.allowUnknownOptions, true);
			program.parse(['--opt']);

			expect(program.unkOpts.opt).toEqual(true);
		});

		it('should passthrough unknowns', function() {
			var action = createSpy('action');

			var program = keen.program()
				.arguments('<unkOpt>')
				.config(keen.config.enforceOptionParse, false)
				.action(action);
			program.parse(['--opt']);

			expect(action).toHaveBeenCalledWith('--opt');
		});
	});

	it('should be accessible on `this`', function() {
		var opts;
		var unkOpts;

		var program = keen.program()
			.option('--opt')
			.config(keen.config.allowUnknownOptions, true)
			.action(function() {
				opts = this.opts;
				unkOpts = this.unkOpts;
			});
		program.parse(['--opt','--unk']);

		expect(opts).toEqual({'opt':true});
		expect(unkOpts).toEqual({'unk':true});
	});
});