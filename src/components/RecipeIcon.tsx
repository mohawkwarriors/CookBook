import React from 'react';
import { 
  Apple, Banana, Bean, Beef, Beer, Cake, CakeSlice, Candy, Carrot, Cherry, 
  Citrus, Coffee, Cookie, Croissant, CupSoda, Donut, Drumstick, Egg, EggFried, 
  Fish, Flame, GlassWater, Grape, Ham, Hamburger, IceCream, IceCreamBowl, 
  IceCreamCone, Leaf, LeafyGreen, Lollipop, Martini, Milk, Nut, Pizza, Popcorn, 
  Salad, Sandwich, Shrimp, Soup, Utensils, UtensilsCrossed, Vegan, Wheat, Wine
} from 'lucide-react';
import { Recipe } from '../types';

interface RecipeIconProps {
  recipe: Recipe;
  className?: string;
}

const iconMapping: { keywords: string[], Icon: React.ElementType }[] = [
  // Meats & Seafood (30+ keywords)
  { keywords: ['shrimp', 'prawn', 'scampi', 'lobster', 'crab', 'crawfish', 'crayfish', 'langoustine', 'clam', 'oyster', 'mussel', 'scallop', 'squid', 'calamari', 'octopus', 'seafood'], Icon: Shrimp },
  { keywords: ['fish', 'salmon', 'tuna', 'cod', 'halibut', 'trout', 'snapper', 'bass', 'mahi', 'tilapia', 'flounder', 'catfish', 'sardine', 'anchovy', 'mackerel', 'swordfish', 'haddock'], Icon: Fish },
  { keywords: ['beef', 'steak', 'meatball', 'brisket', 'ribs', 'veal', 'chuck', 'sirloin', 'ribeye', 'tenderloin', 'pastrami', 'corned beef', 'roast beef', 'meat'], Icon: Beef },
  { keywords: ['ham', 'pork', 'bacon', 'prosciutto', 'pancetta', 'salami', 'pepperoni', 'sausage', 'chorizo', 'bratwurst', 'hot dog', 'frankfurter', 'spam', 'carnitas', 'pork belly'], Icon: Ham },
  { keywords: ['chicken', 'turkey', 'poultry', 'duck', 'goose', 'quail', 'pheasant', 'hen', 'wings', 'nuggets', 'drumsticks', 'roasted chicken'], Icon: Drumstick },
  
  // Dairy & Eggs (20+ keywords)
  { keywords: ['egg', 'omelet', 'frittata', 'quiche', 'shakshuka', 'scrambled', 'poached'], Icon: Egg },
  { keywords: ['fried egg', 'sunny side'], Icon: EggFried },
  { keywords: ['milk', 'cream', 'yogurt', 'kefir', 'buttermilk', 'butter', 'ghee', 'cheese', 'cheddar', 'mozzarella', 'brie', 'gouda', 'feta', 'parmesan', 'ricotta', 'paneer'], Icon: Milk },
  
  // Veggies & Plants (40+ keywords)
  { keywords: ['carrot', 'radish', 'turnip', 'parsnip', 'sweet potato', 'yam', 'beet', 'root vegetable'], Icon: Carrot },
  { keywords: ['bean', 'lentil', 'chickpea', 'edamame', 'soy', 'tofu', 'tempeh', 'hummus', 'kidney bean', 'black bean', 'pinto', 'lima', 'navy bean', 'garbanzo', 'fava'], Icon: Bean },
  { keywords: ['leaf', 'spinach', 'kale', 'lettuce', 'arugula', 'cabbage', 'bok choy', 'chard', 'collard', 'mustard greens', 'watercress', 'endive', 'radicchio', 'seaweed', 'kelp', 'nori', 'herb'], Icon: LeafyGreen },
  { keywords: ['salad', 'slaw', 'tabbouleh', 'fattoush', 'caprese'], Icon: Salad },
  { keywords: ['vegan', 'plant based', 'vegetarian'], Icon: Vegan },
  { keywords: ['wheat', 'flour', 'dough', 'grain', 'oats', 'barley', 'rye', 'quinoa', 'millet', 'couscous', 'farro', 'bulgur', 'spelt', 'buckwheat'], Icon: Wheat },
  { keywords: ['nut', 'almond', 'peanut', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia', 'pine nut', 'chestnut', 'sunflower seed', 'pumpkin seed', 'chia', 'flax', 'sesame'], Icon: Nut },
  
  // Fruits (30+ keywords)
  { keywords: ['apple', 'pear', 'quince', 'peach', 'plum', 'apricot', 'nectarine', 'fruit'], Icon: Apple },
  { keywords: ['banana', 'plantain'], Icon: Banana },
  { keywords: ['cherry', 'cranberry', 'pomegranate', 'berry', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'mulberry', 'boysenberry'], Icon: Cherry },
  { keywords: ['grape', 'raisin', 'sultana', 'currant'], Icon: Grape },
  { keywords: ['lemon', 'lime', 'orange', 'grapefruit', 'tangerine', 'clementine', 'pomelo', 'yuzu', 'zest', 'citrus'], Icon: Citrus },
  
  // Baked Goods & Desserts (50+ keywords)
  { keywords: ['cake', 'cupcake', 'muffin', 'brownie', 'blondie', 'cheesecake', 'pound cake', 'sponge cake', 'torte'], Icon: Cake },
  { keywords: ['slice', 'pie', 'tart', 'cobbler', 'crisp'], Icon: CakeSlice },
  { keywords: ['cookie', 'biscuit', 'shortbread', 'macaroon', 'macaron', 'biscotti', 'gingerbread', 'snickerdoodle', 'wafer'], Icon: Cookie },
  { keywords: ['croissant', 'pastry', 'danish', 'strudel', 'eclair', 'cannoli', 'puff pastry', 'phyllo', 'turnover'], Icon: Croissant },
  { keywords: ['donut', 'doughnut', 'churro', 'beignet', 'fritter', 'cruller'], Icon: Donut },
  { keywords: ['candy', 'chocolate', 'caramel', 'fudge', 'toffee', 'marshmallow', 'nougat', 'gummy', 'jelly', 'licorice', 'truffle', 'praline', 'brittle', 'bark', 'sweet'], Icon: Candy },
  { keywords: ['lollipop', 'sucker', 'hard candy'], Icon: Lollipop },
  { keywords: ['ice cream', 'gelato', 'sorbet', 'sherbet', 'frozen yogurt'], Icon: IceCream },
  { keywords: ['sundae', 'split', 'bowl'], Icon: IceCreamBowl },
  { keywords: ['cone'], Icon: IceCreamCone },
  
  // Prepared Foods (30+ keywords)
  { keywords: ['pizza', 'flatbread', 'calzone', 'stromboli', 'focaccia'], Icon: Pizza },
  { keywords: ['burger', 'hamburger', 'cheeseburger', 'slider'], Icon: Hamburger },
  { keywords: ['sandwich', 'sub', 'hoagie', 'grinder', 'melt', 'panini', 'wrap', 'gyro', 'shawarma', 'kebab', 'falafel', 'taco', 'burrito', 'enchilada', 'quesadilla', 'fajita', 'torta'], Icon: Sandwich },
  { keywords: ['soup', 'stew', 'broth', 'chili', 'chowder', 'bisque', 'gumbo', 'curry', 'ramen', 'pho', 'bouillon', 'consomme', 'potage'], Icon: Soup },
  { keywords: ['popcorn', 'kettle corn'], Icon: Popcorn },
  
  // Drinks (30+ keywords)
  { keywords: ['coffee', 'espresso', 'latte', 'cappuccino', 'macchiato', 'mocha', 'americano', 'cold brew', 'frappe', 'tea', 'chai', 'matcha'], Icon: Coffee },
  { keywords: ['beer', 'ale', 'lager', 'stout', 'pilsner', 'ipa', 'cider', 'mead'], Icon: Beer },
  { keywords: ['wine', 'merlot', 'chardonnay', 'cabernet', 'pinot', 'syrah', 'zinfandel', 'champagne', 'prosecco', 'sangria'], Icon: Wine },
  { keywords: ['martini', 'cocktail', 'margarita', 'mojito', 'daiquiri', 'vodka', 'gin', 'rum', 'tequila', 'whiskey', 'bourbon', 'scotch', 'cognac', 'brandy', 'liquor'], Icon: Martini },
  { keywords: ['water', 'sparkling', 'seltzer', 'tonic', 'aqua'], Icon: GlassWater },
  { keywords: ['soda', 'pop', 'cola', 'juice', 'lemonade', 'punch', 'smoothie', 'shake', 'beverage', 'drink'], Icon: CupSoda },
  
  // Cooking Methods & General (10+ keywords)
  { keywords: ['spicy', 'fire', 'hot', 'grilled', 'bbq', 'barbecue', 'smoke', 'charred'], Icon: Flame },
  { keywords: ['chef', 'cook', 'recipe', 'meal', 'dinner', 'lunch', 'breakfast'], Icon: Utensils }
];

export default function RecipeIcon({ recipe, className = "" }: RecipeIconProps) {
  const title = recipe.title.toLowerCase();
  const cuisine = recipe.cuisine?.toLowerCase() || "";
  const mealType = recipe.mealType?.toLowerCase() || "";
  
  const textToSearch = `${title} ${cuisine} ${mealType}`;
  
  let Icon = UtensilsCrossed; // Fallback
  
  for (const mapping of iconMapping) {
    if (mapping.keywords.some(keyword => textToSearch.includes(keyword))) {
      Icon = mapping.Icon;
      break;
    }
  }

  return (
    <div className={`flex items-center justify-center bg-transparent text-accent-500 dark:text-accent-400 ${className}`}>
      <Icon className="w-[55%] h-[55%] opacity-90" strokeWidth={1.5} />
    </div>
  );
}
