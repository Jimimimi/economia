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