

var Role = createClass('Role',{
	initialize: function(data){
		function parseData(){

		}

		this.id = data.id;
		this.inventory = (function(data){
			var inv = {
				stuff: {},
				maxSize: data.inventory.max_size
			};
			for (var com in data.inventory.start){
				inv.stuff[com] = {};
				inv.stuff[com].amount = data.inventory.start[com];
			};
			for (var comm in data.inventory.ideal){
				inv.stuff[comm].ideal = data.inventory.ideal[comm];
			};
			return inv;
		}(data));

		this.money = data.money;
		this.logic = new Logic(data.logic);
	},
	getStartInventory: function(){
		var i = new Inventory(this.inventory);
		return i;

	}
});

