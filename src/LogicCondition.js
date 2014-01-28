

var LogicCondition = createClass('LogicCondition',{
	initialize: function(str) {
		this.negated = false;
		if (str.substr(0,1) === '!') {
			this.negated = true;
			str = str.substr(1, str.length - 1);
		};
		this.condition = str;
	}
});

