// var createClass = function(className,methods) {   
//     var ClassObj = function() {    
//         this.initialize.apply(this, arguments);          
//     };
//     for (var property in methods) { 
//        ClassObj.prototype[property] = methods[property];
//     };
    
//     ClassObj.prototype._class = className;

//     if (!ClassObj.prototype.initialize) ClassObj.prototype.initialize = function(){};      
    
//     return ClassObj;    
// };
//(function(){
  
var createClass = function(className,methods) {   
    
    var str = 'var ' + className + ' = function(){this.initialize.apply(this,arguments);};';
    eval(str);
    for (var property in methods) { 
       eval(className).prototype[property] = methods[property];
    }
    
    eval(className).prototype._class = className;

    if (!eval(className).prototype.initialize) eval(className).prototype.initialize = function(){};      
    
    return eval(className);    
};

var Inventory = createClass('Inventory', {

  initialize: function(commodities){
    this.stuff = {};
    for (var key in commodities){
      this.stuff[key] = commodities[key];
    }
    this.maxSize = 20;
  },
  list: function(){
    var arr = [];
    for ( var commodity in this.stuff ){
      arr.push(commodity);
    }
    return arr;
  },
  getItem: function(commodity){
    return this.stuff[commodity];
  },
  getSpaceUsed: function(){
    var spaceUsed = 0;
    for (var item in this.stuff){
      spaceUsed += this.stuff[item].size;
    }
    return spaceUsed;
  },
  getSpaceEmpty: function(){
    return this.maxSize - this.getSpaceUsed();
  },
  surplus: function(commodity){
    var com = this.stuff[commodity];
    if ( com.amount > com.ideal ) {
      return ( com.amount - com.ideal );
    }
    return 0;
  },
  shortage: function(commodity){
    var com = this.stuff[commodity];
    if ( com.amount < com.ideal ) {
      return ( com.ideal - com.amount );
    }
    return 0;
  }

});
  
var Agent = createClass('Agent',{
  
  initialize: function(data,market) {
    

    this.id = data.id;
    this.role = data.role;
    this.cash = 100;
    this._cash = 0;
    this.destroyed = false;

    // add only own commodities to inventory
    function getInventory(){
      var inv = {};
      for (var need in data.needs){
        inv[need] = {
          amount: 0,
          size: market.getCommodity(need).size,
          ideal: data.needs[need]
        };

      }
      for (var product in data.produce){
        inv[product] = {
          amount: 0,
          size: market.getCommodity(product).size,
          ideal: data.produce[product]
        };
      }
      return new Inventory(inv);
    }

    this.inventory = getInventory(); // new Inventory(commodities)
    this.priceBeliefs = {
      // "commodity": {x:price * 0.5,y:price * 1.5}
    };
    this.observedTradingRange = {
      // "commodity": [price,price,price etc..]
    };
    // set init values to 0
    for (var commodity in this.inventory.stuff){
      
      this.priceBeliefs[commodity] = {
        x:1, 
        y:10
      };
      this.observedTradingRange[commodity] = [4];
    }
  },
  generateOffers: function(market, commodity) {
    var offer,
      surplus = this.inventory.surplus(commodity);

    if ( surplus >=1 ) {
      offer = this.createAsk(commodity, 1 /* <-why is this here? */);
      if ( offer !== null ) {
        market.ask(offer);
      }
    } else {
      var shortage = this.inventory.shortage(commodity),
        space =  this.inventory.getSpaceEmpty(),
        unit_size = this.inventory.getItem(commodity).size;

      if ( shortage > 0 && space >= unit_size ) {
        var limit = 0;
        if ( (shortage * unit_size) <= space ) { //enough space for ideal order
          limit = shortage;
        } else {                                // not enough space
          limit = Math.floor( space / shortage );
        }

        if ( limit > 0 ) {
          offer = this.createBid(commodity, limit);
          if ( offer !== null ){
            market.bid(offer);
          }
        }
      }
    }
  },
  updatePriceModel: function(market, act, commodity, success, unitPrice) {
    var // Statics
      SIGNIFICANT = 0.25,
      SIG_IMBALANCE = 0.33,
      LOW_INVENTORY = 0.1,
      HIGH_INVENTORY = 2.0,
      MIN_PRICE = 0.01;

    var observedTrades = this.observedTradingRange[commodity],
      publicMeanPrice = market.getAvgPrice(commodity),
      belief = this.priceBeliefs[commodity],
      mean = (belief.x + belief.y) / 2,
      wobble = 0.05,
      deltaToMean = mean - publicMeanPrice;

    if ( success ) {
      observedTrades.push(unitPrice);
      if ( act == 'buy' && deltaToMean > SIGNIFICANT ) {  //overpaid
        belief.x -= deltaToMean / 2;                      // SHIFT towards mean
        belief.y -= deltaToMean / 2;
      } else if ( act == 'sell' && deltaToMean < -SIGNIFICANT ) { //undersold
        belief.x -= deltaToMean / 2;                      // SHIFT towards mean
        belief.y -= deltaToMean / 2;
      }

      belief.x += wobble * mean; //increase the belief's certainty
      belief.y -= wobble * mean;
    } else {
      belief.x -= deltaToMean / 2;
      belief.y -= deltaToMean / 2;

      var specialCase = false,
        stocks = this.inventory.stuff[commodity].amount,
        ideal = this.inventory.stuff[commodity].ideal;

      if ( act == 'buy' && stocks < LOW_INVENTORY * ideal ) {
        //very low on inventory AND can't buy
        wobble *= 2;
        specialCase = true;
      } else if ( act == 'sell' && stocks > HIGH_INVENTORY * ideal ) {
        //very high stock of commodity AND can't sell
        wobble *= 2;
        specialCase = true;
      }

      if ( !specialCase ) {
        var asks = market.history.asks[commodity].slice(-1)[0],
          bids = market.history.bids[commodity].slice(-1)[0],
          supplyVSdemand = (asks - bids) / (asks + bids);

        if ( supplyVSdemand > SIG_IMBALANCE || supplyVSdemand < -SIG_IMBALANCE ) {
          //too much supply: lower price
          //too much demand: raise price

          var newMean = publicMeanPrice * (1 - supplyVSdemand);
          deltaToMean = mean - newMean;

          belief.x -= deltaToMean / 2;
          belief.y -= deltaToMean / 2;
        }
      }

      belief.x -= wobble * mean; //decrease the belief's certainty
      belief.y += wobble * mean;
    }

    if ( belief.x < MIN_PRICE ) { 
      belief.x = MIN_PRICE;
    } else if ( belief.y < MIN_PRICE ) {
      belief.y = MIN_PRICE;
    }

  },
  getTradePoint: function(commodity){
    var arr = this.observedTradingRange[commodity],
      point = {
        x : Math.min.apply(Math,arr),
        y : Math.max.apply(Math,arr)
      }; 
    return point;
  },
  determinePrice: function(commodity){
    var belief = this.priceBeliefs[commodity];
    return Math.random() * (belief.y-belief.x) + belief.x;
  },
  positionInRange: function(val, min, max, clamp){
    val -= min;
    max -= min;
    min = 0;
    val = (val / (max-min));
    if (clamp) {
      if ( val < 0 ) { val = 0; }
      if ( val > 1 ) { val = 1; }
    }
    return val;
  },
  determinePurchaseQty: function(commodity) {
    // 1. mean -> historical mean price of commodity
    // 2. favorability -> *max price* position of mean within observed trading range
    // 3. amount to sell -> favorability * available inventory space
    // 4. return amount to sell
    var mean = market.getAvgPrice(commodity),
      tradingRange = this.getTradePoint(commodity);

    if ( tradingRange !== null ) {
      var favorability = this.positionInRange(mean, tradingRange.x,tradingRange.y,true);
      favorability = 1 - favorability;
      //do 1 - favorability to see how close we are to the low end
    
      var amountToBuy = Math.round(favorability * this.inventory.shortage(commodity));
      if (amountToBuy < 1) {
        amountToBuy = 1;
      }
      return amountToBuy;
    }
    return 0;
  },
  determineSaleQty: function(commodity) {
     var mean = market.getAvgPrice(commodity),
      tradingRange = this.getTradePoint(commodity);

    if ( tradingRange !== null ) {
      var favorability = this.positionInRange(mean, tradingRange.x,tradingRange.y,true);

      var amountToSell = Math.round(favorability * this.inventory.surplus(commodity));
      if ( amountToSell < 1 ) {
        amountToSell = 1;
      }
      return amountToSell;
    }
    return 0;
  },
  createBid: function(commodity,limit) {
    // Bid to purchase a _limit_ of _commodity_        --#page 4
    var price = this.determinePrice(commodity),
      ideal = this.determinePurchaseQty(commodity),
      qtyToBuy = (function(){
        if (ideal > limit){
          return limit;
        } else {
          return ideal;
        }
      })();
    if (qtyToBuy > 0){
      return new Offer(this.id,commodity,qtyToBuy,price);
    }
    return null;
  },
  createAsk: function(commodity, limit) {
    // Ask to sell at least _limit_ of _commodity_     --#page 4
    var price = this.determinePrice(commodity),
      ideal = this.determineSaleQty(commodity),
      qtyToSell = (function(){
        if (ideal < limit){
          return limit;
        } else {
          return ideal;
        }
      })();

    if ( qtyToSell > 0 ) {
      return new Offer(this.id, commodity, qtyToSell, price);
    }

    return null;
  },
  produce: function(commodity){

  },
  updatePriceBelief: function(commodity){
      var price = market.getAvgPrice(commodity);
      this.priceBeliefs[commodity] = {
        x:price * 0.5, 
        y: price * 1.5
      };
  }
});

var Commodity = createClass('Commodity', {
  initialize: function(data){
    // todo
    this.name = data.name;
    this.size = data.size;
    
  }


});

var Offer = createClass('Offer', {
  initialize: function(agentId,commodity,amount,price){
    this.agentId = agentId;
    this.commodity = commodity;
    this.amount = amount;
    this.pricePerUnit = price;
  },
  toString: function(){
    return '('+this.agentId+'): '+this.commodity+' x ' +this.amount+' @ '+this.pricePerUnit;
  }
});
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
    for (var key in data.agents){
      var agent = data.agents[key];
      agent.id = this.agents.length + 1;
      this.agents.push(new Agent(agent,this));
    }
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
      var seller = bids[0],
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
      inventory.forEach(function(commodity){
        agent.generateOffers(this,commodity);
      }, this);
    }, this);

    this.commodities.forEach(function(commodity){
      this.resolveOffers(commodity.name);
    }, this);

  },
  test: function(commodity){
    this.getAgent(1).inventory.stuff[commodity].amount = 5;
    this.getAgent(1).generateOffers(this,commodity);
    this.getAgent(2).generateOffers(this,commodity);
    this.resolveOffers(commodity);
  }
});



var dummyData = {
  agents: [
    {
      role: 'farmer',
      needs: {'food':1,'tools':1},
      produce: {'grain':4}
    },
    {
      role: 'farmer',
      needs: {'food':1,'tools':1},
      produce: {'grain':4}
    },
    {
      role: 'miner',
      needs: {'water':2,'tools':2},
      produce: {'ore':4}
    },
    {
      role: 'blacksmith',
      needs: {'water':2,'ore':2, 'tools': 1},
      produce: {'tools':4}
    },
    {
      role: 'baker',
      needs: {'grain':2},
      produce: {'food':4}
    },
    {
      role: 'farmer',
      needs: {'water':2,'tools':2},
      produce: {'grain':4}
    }

  ],

  commodities: [
    {
      name: 'water',
      size: 0
    },
    {
      name: 'tools',
      size: 1
    },
    {
      name: 'grain',
      size: 3
    },
    {
      name: 'ore',
      size: 3
    },
    {
      name: 'food',
      size: 3
    }
  ]
};



var market = new Economia(dummyData);
module.exports = market;
//})();
