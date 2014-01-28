

var LogicNode = createClass('LogicNode',{
  initialize: function(data) {
    this.isLeaf = false; //if it's a leaf node, it should only have actions
               //if it's a branch node, it should only have conditions/params

    this.params = null;
    this.nodeTrue = null;
    this.nodeFalse = null;
    this.actions = null;

    if ( data !== null ) {
      if (data.hasOwnProperty('condition')) {
        this.isLeaf = false;

        var listConditions = data.condition;
        this.conditions = [];
        for (var condition in listConditions){
          this.conditions.push(new LogicCondition(listConditions[condition]));
        }
        this.params = data.param;
        if (data.hasOwnProperty('if_true')){
          this.nodeTrue = new LogicNode(data.if_true);
        }
        if (data.hasOwnProperty('if_false')){
          this.nodeFalse = new LogicNode(data.if_false);
        }
      } else {
        this.isLeaf = true;
        var listActions = data.action;
        this.actions = [];
        for (var action in listActions) {
          this.actions.push(new LogicAction(listActions[action]));
        }
      }
    }
  }
});

