var keen = require('../keen');

describe("Options", function() {
	var program;
	beforeEach(function() {
		program = keen.program();
	});

	it('should be accepted', function() {
		program
			.option('--opt');
		program.parse(['--opt']);

		expect(program.opts.opt).toEqual(true);
	});

	it('should allow a required argument', function() {
		program
			.option('--opt <a>');
		program.parse(['--opt','a']);

		expect(program.opts.opt).toEqual('a');
	});

	it('should allow an optional argument', function() {
		program
			.option('--opt [a]');
		program.parse(['--opt']);

		expect(program.opts.opt).toEqual(true);
	});

	it('should allow custom defaultOn values', function() {
		program
			.option('--opt', '', {defaultOn: 'a'});
		program.parse(['--opt']);

		expect(program.opts.opt).toEqual('a');
	});

	describe('when configured to allow unknowns', function() {
		beforeEach(function() {
			program
				.config(keen.config.allowUnknownOptions, true);
		});
		it('should allow unknowns', function() {
			program.parse(['--opt']);

			expect(program.unkOpts.opt).toEqual(true);
		});

		it('should allow arguments for unknowns', function() {
			program
				.config(keen.config.unknownOptionHandler, function(name) {
					return {argument: '[value]'};
				});
			program.parse(['--opt','a']);

			expect(program.unkOpts.opt).toEqual('a');
		});
	});

	describe('when configured to passthrough unknowns', function() {
		beforeEach(function() {
			program
				.config(keen.config.enforceOptionParse, false);
		});
		it('should passthrough unknowns', function() {
			var action = createSpy('action');

			program
				.arguments('<unkOpt>')
				.action(action);
			program.parse(['--opt']);

			expect(action).toHaveBeenCalledWith('--opt');
		});
	});

	it('should be accessible on `this`', function() {
		var opts;
		var unkOpts;

		program
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