var keen = require('../keen');

describe("Commands", function() {
	it('should be accepted', function() {
		var action = createSpy('action');

		var program = keen.program();
		program
			.command('a')
			.action(action);
		program.parse(['a']);

		expect(action).toHaveBeenCalled();
	});
});