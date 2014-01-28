Economia.js
=========

Economia.js is a Javascript port of [bazaarBot] (https://github.com/larsiusprime/bazaarBot), making it a perfect fit for HTML5 based games that want to include some sort of market simulation.

### Description:

> A simple agent-based free market simulator engine. 

> This engine consists of various "Agents" trading commodities, with emergent free-floating prices that rise and fall according to the laws of supply and demand. 

> The eventual goal is to create an open-source "Economics engine" for games and simulations, much like contemporary open-source "Physics engines."

> Based on "[Emergent Economies for Role Playing Games](http://larc.unt.edu/techreports/LARC-2010-03.pdf)" by Jonathon Doran and Ian Parberry.

> Source: [Procedural Content Generation](http://larc.unt.edu/ian/research/content/)
	
Usage:
---------------------------

* Include `economia.js`:`<script src="economia.min.js"></script>`
* Add some data:

```javascript
var dummyData = {
  agents: [
    {
      role: 'farmer',			// type of agent
      needs: {'food':1,'tools':1},	// commodity name followed by ideal amount
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
```
* Instantiate an economy: `var market = new Economy(dummyData)`
* Call the `tick` method of your economy object to simulate a round: `market.tick()`

Building from source:
---------------------------
### Node to the rescue!

* Clone the repository
* Run `npm install` from the main folder
* Edit `Gruntfile.js` to reflect any changes you have made to the source
* Run `grunt` in the main folder
* All done! Your compiled `economia.js` and minified `economia.min.js` should be in the `build` folder
