var Economia = createClass('Economia', {
  initialize: function(data){
    this.books = {
      asks: {},
      bids: {}
    };
    this.history = {
      price: {},
      asks: {},
      bids: {},
      trades: {},
      profitability: {}
    };
    this.commodities = Array();
    for (var _commodity in data.commodities){
      var commodity = data.commodities[_commodity];
      this.addCommodity(commodity);
    }
    this.agents = Array();

    this.roles = {};
    data.roles.map(function(role){
      this.roles[role.id] = {
        id: role.id,
        inventory: role.inventory,
        logic: role.logic,
        money:role.money
      };
      this.history.profitability[role.id] = [];
    }, this);

    for (var role in data.start_conditions.agents){
      var amount = data.start_conditions.agents[role];
      for (var i = 0; i<= amount;i++){
        this.agents.push(new Agent(this.roles[role],this));  
      }      
    };

  },
  shuffle: function(collection){
    for (var i=0;i<collection.length;i++){
      var ii = (collection.length - 1) - i;
      if (ii > 1) {
        var j = Math.floor(Math.random() * (ii - 1));
        var temp = collection[j];
        collection[j] = collection[ii];
        collection[ii]= temp;
      }
    }
    return collection;
  },
  sortHighestPrice: function(collection){
   
  },
  getAgent: function(agentId){
    var result = this.agents.filter(function(el){
      return el.id == agentId;
    });
    if ( result.length == 1 ) return result[0];
  },
  addCommodity: function(commodity){
    this.commodities.push(new Commodity(commodity));
    this.books.asks[commodity.name] = Array();
    this.books.bids[commodity.name] = Array();
    this.history.price[commodity.name] = Array(1,1.2,1.3); //dummy float to avoid division by zero
    this.history.asks[commodity.name] = Array();
    this.history.bids[commodity.name] = Array();
    this.history.trades[commodity.name] = Array();
  },
  getCommodity: function(commodity){
    var result = this.commodities.filter(function(el){
      return el.name == commodity;
    });
    if (result.length == 1) return result[0];
  },
  getAvgPrice: function(commodity){
    var arr = this.history.price[commodity],
      sum = 0,
      avg;
    for (var i =0; i < arr.length;i++){
      sum += arr[i];
    }
    if (sum !==0){
      avg = sum/arr.length;
    } else {
      avg = 0;
    }
    return avg;
  },
  bid: function(offer){
    this.books.bids[offer.commodity].push(offer);
  },
  ask: function(offer){
    this.books.asks[offer.commodity].push(offer);
  },
  resolveOffers: function(commodity){
    var bids = this.books.bids[commodity],
      asks = this.books.asks[commodity];

    this.shuffle(bids);
    this.shuffle(asks);

    bids.sort(function(a,b){ // Highest PPU to lowest
      if (a.pricePerUnit < b.pricePerUnit) return 1;
      if (a.pricePerUnit > b.pricePerUnit) return -1;
      return 0;
    });
    asks.sort(function(a,b){ // Lowest PPU to highest
      if (a.pricePerUnit > b.pricePerUnit) return 1;
      if (a.pricePerUnit < b.pricePerUnit) return -1;
      return 0;
    });

    var stats = {
      successfulTrades: 0,
      moneyTraded: 0,
      unitsTraded: 0,
      avgPrice: 0,
      numAsks: 0,
      numBids: 0
    };

    var failsafe = 0;

    bids.forEach(function(bid){
      stats.numBids += bid.amount;
    });
    asks.forEach(function(ask){
      stats.numAsks += ask.amount;
    });

    while (bids.length > 0 && asks.length > 0){
      var buyer = bids[0],
        seller = asks[0],
        qtyTraded = Math.min(seller.amount,buyer.amount),
        clearingPrice = (seller.pricePerUnit + buyer.pricePerUnit) / 2;

      if (qtyTraded > 0) {
        seller.amount -= qtyTraded;
        buyer.amount -= qtyTraded;

        this.transferCommodity(commodity, qtyTraded, seller.agentId, buyer.agentId);
        this.transferMoney(qtyTraded * clearingPrice, seller.agentId, buyer.agentId);

        var buyerAgent = this.getAgent(buyer.agentId),
         sellerAgent = this.getAgent(seller.agentId);

        buyerAgent.updatePriceModel(this, 'buy', commodity, true, clearingPrice);
        sellerAgent.updatePriceModel(this, 'sell', commodity, true, clearingPrice);

        //log statistics

        stats.moneyTraded += (qtyTraded * clearingPrice);
        stats.unitsTraded += qtyTraded;
        stats.successfulTrades ++;

      }

      if ( seller.amount === 0) { //seller is out of offered good
        asks.splice(0,1);        //remove offer
        failsafe = 0;
      }
      if ( buyer.amount === 0) { //buyer has bought all he needs
        bids.splice(0,1);       //remove offer
        failsafe = 0;
      }

      failsafe ++;

      if (failsafe > 1000) {
        console.log('something went wrong');
      }
    }

    //reject remaining offers and update price beliefs

    while(bids.length > 0) {
      var buyer = bids[0],
        buyerAgent = this.getAgent(buyer.agentId);

      buyerAgent.updatePriceModel(this,'buy',commodity,false);
      bids.splice(0,1);
    }
    while(asks.length > 0) {
      var seller = asks[0],
        sellerAgent = this.getAgent(seller.agentId);

      sellerAgent.updatePriceModel(this,'sell',commodity,false);
      asks.splice(0,1);
    }

    //update history

    this.history.bids[commodity].push(stats.numBids);
    this.history.asks[commodity].push(stats.numAsks);
    this.history.trades[commodity].push(stats.unitsTraded);

    if ( stats.unitsTraded > 0 ) {
      stats.avgPrice = stats.moneyTraded / stats.unitsTraded;
      this.history.price[commodity].push(stats.avgPrice);
    } else {
      //special case: none were traded this round, use last round's avg price
      var arr = this.history.price[commodity];
      stats.avgPrice = arr[arr.length - 1];
      this.history.price[commodity].push(stats.avgPrice);
    }

  },
  getHistoryAvg: function(mode, commodity, range){
    var arr = this.history[mode][commodity],
      newArr = arr.slice(arr.length-(range-1)),
      sum = 0,
      avg;
    for (var i =0; i < newArr.length;i++){
      sum += newArr[i];
    }
    if (sum !==0){
      avg = sum/newArr.length;
    } else {
      avg = 0;
    }
    return avg;
  },
  getHistoryProfitAvg: function(role,range){
    var arr = this.history.profitability[role],
      newArr = arr.slice(arr.length-(range-1)),
      sum = 0,
      avg;
    for (var i=0; i< newArr.length; i++){
      sum += newArr[i];
    }
    if (sum !== 0){
      avg = sum/newArr.length;
    } else {
      avg = 0;
    }
    return avg;
  },
  getBestMarketOpportunity: function(){
    var bestMarket = '',
      bestRatio = -999999,
      minimum = 1.5;
    this.commodities.forEach(function(commodity){
      var asks = this.getHistoryAvg('asks',commodity.name,10),
        bids = this.getHistoryAvg('bids',commodity.name,10),
        ratio = 0;
      
      if ( asks === 0 && bids > 0){
        ratio = 999999999999;
      } else {
        ratio = bids / asks ;
      }
    

      console.log(commodity.name, ratio);

      if ( ratio > minimum && ratio > bestRatio) {
        bestRatio = ratio;
        bestMarket = commodity.name;
      }

    },this);

    return bestMarket;
  },
  getMostProfitableRole: function(){
    var list,
      best = -99999,
      bestRole = '';
    for (var role in this.roles){
      var val = this.getHistoryProfitAvg(role,10);
      if (val > best) {
        bestRole = role;
        best = val;
      }
    }
    return bestRole;
  },
  getRoleThatMakesMostOf: function(commodity){
    var bestAmount = 0,
      bestRole = '';

    for (var role in this.roles){
      var arr = this.agents.filter(function(agent){
        return agent.role.id == role;
      }, role);
      var logic = arr[0].role.logic;
      console.log(logic); //return the first agent to match;
      var amount = logic.getProduction(commodity, logic.root);
      if (amount > bestAmount){
        bestAmount = amount;
        bestRole = role;
      }
    }

    return bestRole;
  },
  replaceAgent: function(agent){
    var bestRole = this.getMostProfitableRole();
    //Special case to deal with very high demand-to-supply ratios
    //This will make them favor entering an underserved market over
    //Just picking the most profitable class

    var bestOpportunity = this.getBestMarketOpportunity();
    if ( bestOpportunity !== '' ) {
      var bestOpportunityRole = this.getRoleThatMakesMostOf(bestOpportunity);
      if ( bestOpportunityRole !== '' ) {
        bestRole = bestOpportunityRole;
      };
    };
    
    var newAgent = new Agent(this.roles[bestRole],this);
    this.agents.pop(agent);
    newAgent.id = agent.id;
    console.log('Agent '+ agent.id + ' (a '+agent.role.id+') went bankrupt. He was replaced by a ' + bestRole) //bankrupt
    this.agents.push(newAgent);

  },
  transferCommodity: function(commodity,amount, sellerId, buyerId){
    var seller = this.getAgent(sellerId),
      buyer = this.getAgent(buyerId);

    seller.inventory.stuff[commodity].amount -= amount;
    buyer.inventory.stuff[commodity].amount += amount;
  },
  transferMoney: function(amount,sellerId,buyerId){
    var seller = this.getAgent(sellerId),
      buyer = this.getAgent(buyerId);

    seller.cash += amount;
    buyer.cash -= amount;
  },
  tick: function(render){
    this.agents.forEach(function(agent){
      var inventory = agent.inventory.list();
      agent._cash = agent.cash;

      agent.role.logic.perform(agent, agent.role.logic.root);

      inventory.forEach(function(commodity){
        agent.generateOffers(this,commodity);
      }, this);
    }, this);

    this.commodities.forEach(function(commodity){
      this.resolveOffers(commodity.name);
    }, this);

    this.agents.forEach(function(agent){
      if (agent.cash <= 0){
        this.replaceAgent(agent);
      }
    }, this);

  },
  test: function(commodity){
    this.getAgent(1).inventory.stuff[commodity].amount = 5;
    this.getAgent(1).generateOffers(this,commodity);
    this.getAgent(2).generateOffers(this,commodity);
    this.resolveOffers(commodity);
  }
});

window.Economia = Economia;