var Agent = createClass('Agent',{
  
  initialize: function(data,market) {
    

    this.id = market.agents.length + 1;
    this.role = new Role(data);
    this.cash = this.role.money;
    this._cash = 0;
    this.destroyed = false;

    // add only own commodities to inventory
    // function getInventory(){
    //   var inv = {};
    //   for (var need in data.needs){
    //     inv[need] = {
    //       amount: 0,
    //       size: market.getCommodity(need).size,
    //       ideal: data.needs[need]
    //     };

    //   }
    //   for (var product in data.produce){
    //     inv[product] = {
    //       amount: 0,
    //       size: market.getCommodity(product).size,
    //       ideal: data.produce[product]
    //     };
    //   }
    //   return new Inventory(inv);
    // }

    this.inventory = this.role.getStartInventory(); // new Inventory(commodities)
    this.priceBeliefs = {
      // "commodity": {x:price * 0.5,y:price * 1.5}
    };
    this.observedTradingRange = {
      // "commodity": [price,price,price etc..]
    };
    // set init values to 0
    for (var commodity in this.inventory.stuff){
      this.inventory.stuff[commodity].size = parseInt(market.getCommodity(commodity).size);
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