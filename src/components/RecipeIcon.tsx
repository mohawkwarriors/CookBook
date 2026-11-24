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
  variant?: 'cover' | 'compact';
}

const iconMapping: { keywords: string[]; Icon: React.ElementType }[] = [
  // Meats & Seafood
  { keywords: ['shrimp', 'prawn', 'scampi', 'lobster', 'crab', 'crawfish', 'crayfish', 'langoustine', 'clam', 'oyster', 'mussel', 'scallop', 'squid', 'calamari', 'octopus', 'seafood'], Icon: Shrimp },
  { keywords: ['fish', 'salmon', 'tuna', 'cod', 'halibut', 'trout', 'snapper', 'bass', 'mahi', 'tilapia', 'flounder', 'catfish', 'sardine', 'anchovy', 'mackerel', 'swordfish', 'haddock'], Icon: Fish },
  { keywords: ['beef', 'steak', 'meatball', 'brisket', 'ribs', 'veal', 'chuck', 'sirloin', 'ribeye', 'tenderloin', 'pastrami', 'corned beef', 'roast beef', 'meat'], Icon: Beef },
  { keywords: ['ham', 'pork', 'bacon', 'prosciutto', 'pancetta', 'salami', 'pepperoni', 'sausage', 'chorizo', 'bratwurst', 'hot dog', 'frankfurter', 'spam', 'carnitas', 'pork belly'], Icon: Ham },
  { keywords: ['chicken', 'turkey', 'poultry', 'duck', 'goose', 'quail', 'pheasant', 'hen', 'wings', 'nuggets', 'drumsticks', 'roasted chicken'], Icon: Drumstick },

  // Dairy & Eggs
  { keywords: ['egg', 'omelet', 'frittata', 'quiche', 'shakshuka', 'scrambled', 'poached'], Icon: Egg },
  { keywords: ['fried egg', 'sunny side'], Icon: EggFried },
  { keywords: ['milk', 'cream', 'yogurt', 'kefir', 'buttermilk', 'butter', 'ghee', 'cheese', 'cheddar', 'mozzarella', 'brie', 'gouda', 'feta', 'parmesan', 'ricotta', 'paneer'], Icon: Milk },

  // Veggies & Plants
  { keywords: ['carrot', 'radish', 'turnip', 'parsnip', 'sweet potato', 'yam', 'beet', 'root vegetable'], Icon: Carrot },
  { keywords: ['bean', 'lentil', 'chickpea', 'edamame', 'soy', 'tofu', 'tempeh', 'hummus', 'kidney bean', 'black bean', 'pinto', 'lima', 'navy bean', 'garbanzo', 'fava'], Icon: Bean },
  { keywords: ['leaf', 'spinach', 'kale', 'lettuce', 'arugula', 'cabbage', 'bok choy', 'chard', 'collard', 'mustard greens', 'watercress', 'endive', 'radicchio', 'seaweed', 'kelp', 'nori', 'herb'], Icon: LeafyGreen },
  { keywords: ['salad', 'slaw', 'tabbouleh', 'fattoush', 'caprese'], Icon: Salad },
  { keywords: ['vegan', 'plant based', 'vegetarian'], Icon: Vegan },
  { keywords: ['wheat', 'flour', 'dough', 'grain', 'oats', 'barley', 'rye', 'quinoa', 'millet', 'couscous', 'farro', 'bulgur', 'spelt', 'buckwheat'], Icon: Wheat },
  { keywords: ['nut', 'almond', 'peanut', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia', 'pine nut', 'chestnut', 'sunflower seed', 'pumpkin seed', 'chia', 'flax', 'sesame'], Icon: Nut },

  // Fruits
  { keywords: ['apple', 'pear', 'quince', 'peach', 'plum', 'apricot', 'nectarine', 'fruit'], Icon: Apple },
  { keywords: ['banana', 'plantain'], Icon: Banana },
  { keywords: ['cherry', 'cranberry', 'pomegranate', 'berry', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'mulberry', 'boysenberry'], Icon: Cherry },
  { keywords: ['grape', 'raisin', 'sultana', 'currant'], Icon: Grape },
  { keywords: ['lemon', 'lime', 'orange', 'grapefruit', 'tangerine', 'clementine', 'pomelo', 'yuzu', 'zest', 'citrus'], Icon: Citrus },

  // Baked Goods & Desserts
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

  // Prepared Foods
  { keywords: ['pizza', 'flatbread', 'calzone', 'stromboli', 'focaccia'], Icon: Pizza },
  { keywords: ['burger', 'hamburger', 'cheeseburger', 'slider'], Icon: Hamburger },
  { keywords: ['sandwich', 'sub', 'hoagie', 'grinder', 'melt', 'panini', 'wrap', 'gyro', 'shawarma', 'kebab', 'falafel', 'taco', 'burrito', 'enchilada', 'quesadilla', 'fajita', 'torta'], Icon: Sandwich },
  { keywords: ['soup', 'stew', 'broth', 'chili', 'chowder', 'bisque', 'gumbo', 'curry', 'ramen', 'pho', 'bouillon', 'consomme', 'potage'], Icon: Soup },
  { keywords: ['popcorn', 'kettle corn'], Icon: Popcorn },

  // Drinks
  { keywords: ['coffee', 'espresso', 'latte', 'cappuccino', 'macchiato', 'mocha', 'americano', 'cold brew', 'frappe', 'tea', 'chai', 'matcha'], Icon: Coffee },
  { keywords: ['beer', 'ale', 'lager', 'stout', 'pilsner', 'ipa', 'cider', 'mead'], Icon: Beer },
  { keywords: ['wine', 'merlot', 'chardonnay', 'cabernet', 'pinot', 'syrah', 'zinfandel', 'champagne', 'prosecco', 'sangria'], Icon: Wine },
  { keywords: ['martini', 'cocktail', 'margarita', 'mojito', 'daiquiri', 'vodka', 'gin', 'rum', 'tequila', 'whiskey', 'bourbon', 'scotch', 'cognac', 'brandy', 'liquor'], Icon: Martini },
  { keywords: ['water', 'sparkling', 'seltzer', 'tonic', 'aqua'], Icon: GlassWater },
  { keywords: ['soda', 'pop', 'cola', 'juice', 'lemonade', 'punch', 'smoothie', 'shake', 'beverage', 'drink'], Icon: CupSoda },

  // Cooking Methods & General
  { keywords: ['spicy', 'fire', 'hot', 'grilled', 'bbq', 'barbecue', 'smoke', 'charred'], Icon: Flame },
  { keywords: ['chef', 'cook', 'recipe', 'meal', 'dinner', 'lunch', 'breakfast'], Icon: Utensils }
];

// Curated editorial neutral-botanical palettes for photo-less recipe covers
const EDITORIAL_SURFACES = [
  { bg: 'bg-[#f4f5f0] dark:bg-[#191c17]', fg: 'text-[#3c4a35] dark:text-[#a6c497]', ring: 'border-[#e4e8dc] dark:border-[#262b23]' }, // Botanical Sage
  { bg: 'bg-[#f7f4ef] dark:bg-[#1c1916]', fg: 'text-[#5c4b3a] dark:text-[#cab59e]', ring: 'border-[#ebe4d9] dark:border-[#2c2721]' }, // Warm Linen
  { bg: 'bg-[#f3f5f6] dark:bg-[#16191c]', fg: 'text-[#3d4c54] dark:text-[#9fb3be]', ring: 'border-[#e2e7ea] dark:border-[#242a2f]' }, // Cool Slate
  { bg: 'bg-[#f8f3f0] dark:bg-[#1d1715]', fg: 'text-[#6c4435] dark:text-[#d5a594]', ring: 'border-[#ede1da] dark:border-[#2f2420]' }, // Soft Terracotta
  { bg: 'bg-[#f5f4f7] dark:bg-[#19181d]', fg: 'text-[#4c4657] dark:text-[#b4acc4]', ring: 'border-[#e6e3ec] dark:border-[#292730]' }, // Muted Plum Stone
  { bg: 'bg-[#f6f6f2] dark:bg-[#1a1a16]', fg: 'text-[#52523a] dark:text-[#c0c09e]', ring: 'border-[#e8e7dc] dark:border-[#2b2b22]' }, // Olive Oat
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function RecipeIcon({ recipe, className = '', variant = 'cover' }: RecipeIconProps) {
  const title = recipe.title.toLowerCase();
  const cuisine = recipe.cuisine?.toLowerCase() || '';
  const mealType = recipe.mealType?.toLowerCase() || '';

  const textToSearch = `${title} ${cuisine} ${mealType}`;

  let Icon: React.ElementType = UtensilsCrossed;

  for (const mapping of iconMapping) {
    if (mapping.keywords.some(keyword => textToSearch.includes(keyword))) {
      Icon = mapping.Icon;
      break;
    }
  }

  const surface = EDITORIAL_SURFACES[hashString(recipe.cuisine || recipe.title) % EDITORIAL_SURFACES.length];

  if (variant === 'compact') {
    return (
      <div className={`flex items-center justify-center ${surface.bg} ${surface.fg} ${className}`}>
        <Icon className="w-[46%] h-[46%]" strokeWidth={1.6} />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden editorial-cover-grain ${surface.bg} ${surface.fg} ${className}`}
    >
      {/* Subtle editorial top-left cuisine tag */}
      {recipe.cuisine && (
        <span className="absolute top-3 left-3 text-[10px] font-medium uppercase tracking-[0.12em] opacity-60 select-none">
          {recipe.cuisine}
        </span>
      )}

      {/* Centered framed emblem */}
      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border ${surface.ring} bg-white/55 dark:bg-black/20 backdrop-blur-[2px] flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]`}>
        <Icon className="w-8 h-8 sm:w-9 sm:h-9" strokeWidth={1.35} />
      </div>
    </div>
  );
}
