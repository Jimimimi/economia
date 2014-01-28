

var Logic = createClass('Logic',{
  initialize: function(data){
    this.src = JSON.stringify(data);
    this.root = new LogicNode(data);
  },

  getProduction: function(commodity,currentNode){
    if ( currentNode === null ) {
      return this.getProduction(commodity,root);
    } else {
      if ( !currentNode.isLeaf ) {
        var a = this.getProduction(commodity,currentNode.nodeTrue);
        var b = this.getProduction(commodity,currentNode.nodeFalse);
        return a + b;
      } else {
        var amount = 0;
        currentNode.actions.forEach(function(act){
          for (var i = 0; i < act.targets.length; i++) {
            switch(act.action) {
              case 'produce':
                if (act.targets[i] === commodity ) {
                  amount += act.chances[i] * act.amounts[i];
                }
                break;
              case 'transform':
                var amt = act.amounts[i];
                if ( amt === -1 ) { amt = 1; } //wtf??
                if ( act.results[i] === commodity ) {
                  amount += act.chances[i] * amt * act.efficiency[i];
                }
                break;
            }
          }
        });
        return amount;
      }
    }
    return 0;
  },

  perform: function(agent,currentNode) {
    if ( !currentNode.isLeaf ) {
      if (this.evaluate(agent,currentNode)) {
        if (currentNode.nodeTrue !== null) {
          this.perform(agent,currentNode.nodeTrue);
        }
      } else {
        if (currentNode.nodeFalse !== null) {
          this.perform(agent,currentNode.nodeFalse);
        }
      }
    } else {
      currentNode.actions.forEach(function(act){
        for ( var i = 0; i < act.targets.length; i++ ) {
          var amount = act.amounts[i];
          var target = act.targets[i];
          var chance = act.chances[i];

          //Roll to see if this happens
          if ( chance >= 1.0 || Math.random() < chance ) {
            var amt = agent.inventory.stuff[target].amount;

            if ( amount === -1) { //-1 means 'match my total value'
              amount = amt;
            }

            switch(act.action) {
              case 'produce':
                agent.inventory.stuff[target].amount += amount;
                break;
              case 'consume':
                agent.inventory.stuff[target].amount -= amount;
                break;
              case 'transform':
                var amountTarget = amount;
                //exchange rate between A -> B  
                var amountProduct = amount * act.efficiency[i];
                var result = act.results[i]

                agent.inventory.stuff[target].amount -= amountTarget;  //consume this much of A
                agent.inventory.stuff[result].amount += amountProduct; //produce this much of B
                break;
            }
          }
        }
      });
    }
  },

  evaluate: function(agent,currentNode) {
    currentNode.conditions.forEach(function(c){
      switch(c.condition) {
        case 'has': //Do you have something?
          var str,
            has = false;
          currentNode.params.forEach(function(commodity){
            var amount = agent.inventory.getAmountOf(commodity);
            if ( amount > 0 ) {
              has = true;
            }
            if (c.negated) {
              if (has) {return false;}
            } else {
              if (!has) {return false;}
            }
          }, agent);
          break;
      }
    }, (agent,currentNode));
    return true;
  }
});

