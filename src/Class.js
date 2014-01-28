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