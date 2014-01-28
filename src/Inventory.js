var Inventory = createClass('Inventory', {

  initialize: function(commodities){
    this.stuff = commodities.stuff;
    this.maxSize = commodities.maxSize;
    // commodities.forEach(function(commodity){
    //   this.stuff[commodity.name] = {
    //     ideal: commodity.ideal,
    //     size: commodity.size,
    //     amount: commodity.start
    //   }
    // },this);
    
  },
  list: function(){
    var arr = [];
    for ( var commodity in this.stuff ){
      arr.push(commodity);
    }
    return arr;
  },
  getAmountOf: function(commodity){
    if (this.getItem(commodity) !== undefined){
      return this.getItem(commodity).amount;
    } else { return 0; }
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