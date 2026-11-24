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

// Rich heritage spice-inspired bookplate palettes (Dishoom / Zareen's / Amrikan)
const EDITORIAL_SURFACES = [
  // Burnished Saffron & Turmeric
  {
    bg: 'bg-[#F6E9D2] dark:bg-[#271F14]',
    fg: 'text-[#8C5216] dark:text-[#E5B06B]',
    frame: 'border-[#DFC49B]/80 dark:border-[#E5B06B]/20',
    medallion: 'bg-[#FFFBF2]/75 dark:bg-[#1A140D]/60 border-[#DFC49B] dark:border-[#E5B06B]/25',
  },
  // Kashmiri Terracotta & Clay
  {
    bg: 'bg-[#F3E2D8] dark:bg-[#2A1A16]',
    fg: 'text-[#963F2B] dark:text-[#E19885]',
    frame: 'border-[#DFBCB0]/80 dark:border-[#E19885]/20',
    medallion: 'bg-[#FFF9F6]/75 dark:bg-[#1C110E]/60 border-[#DFBCB0] dark:border-[#E19885]/25',
  },
  // Cardamom & Pistachio Leaf
  {
    bg: 'bg-[#E5EEE4] dark:bg-[#17231B]',
    fg: 'text-[#355C42] dark:text-[#96C7A4]',
    frame: 'border-[#C1D5BF]/80 dark:border-[#96C7A4]/20',
    medallion: 'bg-[#FAFDF9]/75 dark:bg-[#0F1812]/60 border-[#C1D5BF] dark:border-[#96C7A4]/25',
  },
  // Jaipur Peacock Indigo
  {
    bg: 'bg-[#E3EBF0] dark:bg-[#151F26]',
    fg: 'text-[#2E5066] dark:text-[#95BDD6]',
    frame: 'border-[#BFD1DC]/80 dark:border-[#95BDD6]/20',
    medallion: 'bg-[#F8FBFD]/75 dark:bg-[#0E151A]/60 border-[#BFD1DC] dark:border-[#95BDD6]/25',
  },
  // Pomegranate & Rosewater
  {
    bg: 'bg-[#F2E3E8] dark:bg-[#27181E]',
    fg: 'text-[#853C56] dark:text-[#DDA0B6]',
    frame: 'border-[#DEC0CA]/80 dark:border-[#DDA0B6]/20',
    medallion: 'bg-[#FFF9FB]/75 dark:bg-[#190F13]/60 border-[#DEC0CA] dark:border-[#DDA0B6]/25',
  },
  // Toasted Clove & Sandstone
  {
    bg: 'bg-[#EFE6D8] dark:bg-[#241D16]',
    fg: 'text-[#6A4E34] dark:text-[#D1B495]',
    frame: 'border-[#D8C6AD]/80 dark:border-[#D1B495]/20',
    medallion: 'bg-[#FCF9F3]/75 dark:bg-[#18130E]/60 border-[#D8C6AD] dark:border-[#D1B495]/25',
  },
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

  // Hash by title + cuisine so neighboring recipes get a lively, varied bookplate palette
  const surface = EDITORIAL_SURFACES[hashString(`${recipe.title}-${recipe.cuisine || ''}`) % EDITORIAL_SURFACES.length];

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
      {/* Bespoke hardcover inner inset rule */}
      <div className={`pointer-events-none absolute inset-2.5 rounded-lg border ${surface.frame}`} />

      {/* Subtle editorial top-left cuisine inscription */}
      {recipe.cuisine && (
        <span className="absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-75 select-none">
          {recipe.cuisine}
        </span>
      )}

      {/* Centered bookplate medallion */}
      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border ${surface.medallion} backdrop-blur-[2px] flex items-center justify-center shadow-[0_2px_10px_rgba(35,26,20,0.06)]`}>
        <Icon className="w-7 h-7 sm:w-9 sm:h-9" strokeWidth={1.35} />
      </div>

      {/* Tiny decorative flourish beneath medallion */}
      <div className="mt-3 flex items-center gap-1.5 opacity-45">
        <span className="w-3 h-px bg-current" />
        <span className="w-1 h-1 rounded-full bg-current" />
        <span className="w-3 h-px bg-current" />
      </div>
    </div>
  );
}
