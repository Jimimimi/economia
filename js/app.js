var market, 
	JSONdata,
	round = 0,
	views = {
		market:new Ractive({
				el: 'market',
				template: '#marketTemplate'
		}),
		render: function(market){
			round += 1;
			views.market.set({
				round: round
			});
			views.agents.set({
				agents: market.agents
			});
			views.commodities.set({
				commodities: getCommodityData()
			})
		},
		agents: new Ractive({
			el: 'agents',
			template: '#agentsTemplate'
		}),
		commodities: new Ractive({
			el: 'commodities',
			template: '#commoditiesTemplate'
		})
	};

function getCommodityData(){
	var arr = [];
	market.commodities.forEach(function(commodity){
		var avg = market.getAvgPrice(commodity.name);
		var diff = market.history.price[commodity.name][market.history.price[commodity.name].length-2] - avg;
		var c = {
			name: commodity.name,
			priceAvg: avg,
			diff: diff
		};
		arr.push(c);
	})
	return arr;
}

$.getJSON('data/data.json', function(data){
	JSONdata = data;
	market = new Economia(data);

	market.tick(views.render(market)); // first render;
})

