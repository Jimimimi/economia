

var LogicAction = createClass('LogicAction',{
  initialize: function(data){
    this.action = '';
    this.targets = [];
    this.amounts = [];
    this.chances = [];
    this.efficiency = [];
    this.results = [];
    this.data = data;

    for (var str in data) {
      var lstr = str.toLowerCase();
      switch(lstr) {
        case 'produce':
          this.action = 'produce';
          this.targets = data.produce;
          break;
        case 'consume':
          this.action = 'consume';
          this.targets = data.consume;
          break;
        case 'transform':
          this.action = 'transform';
          this.targets = data.transform;
          break;
        case 'amount':
          this.amounts = [];
          var list_amounts = data[str]
          for (val in list_amounts) {
            if (typeof(val) === 'string' && val == 'all') {
              this.amounts.push(-1);      //-1 means 'all', negative values are strictly reserved for this
                            //sign is already implied by 'produce/consume/transform' etc
            }else {
              this.amounts.push(list_amounts[val]);
            }
          }
          break;
        case 'chance':
          this.chances = data[str];
          break;
        case 'efficiency':
          this.efficiency = data[str];
          break;
        case 'into':
          this.results = data[str];
          break;
      }
    }
    
    if (this.amounts == null) { this.amounts = [];}
    if (this.chances == null) { this.chances = [];}
    
    if(this.action == 'transform'){
      if (this.efficiency == null) { this.efficiency = []; }
    }
      
    for (var i = 0; i < this.targets.length; i++) {
      if (i > this.amounts.length - 1) {
        this.amounts.push(1);      //if item is specified but amount is not, amount is 1
      }     
      if (i > this.chances.length - 1) {
        this.chances.push(1);      //if item is specified but chance is not, chance is 1
      }
      if(this.action == 'transform'){
        if (i > this.efficiency.length - 1) {
          this.efficiency.push(1);     //if item is specified but efficiency is not, efficiency is 1
        }
      }
    }
    
  }
});

