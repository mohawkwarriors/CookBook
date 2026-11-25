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

// Modern spice-inspired gradient palettes (Option E aurora in light mode, Option A lighter gradient in dark mode)
interface SurfacePalette {
  lightBase: string;
  lightOrb1: string;
  lightOrb2: string;
  lightIcon: string;
  darkFrom: string;
  darkTo: string;
  darkGlow: string;
  darkIcon: string;
}

const MODERN_SURFACES: SurfacePalette[] = [
  // Burnished Saffron & Turmeric
  {
    lightBase: '#F0DFC2',
    lightOrb1: 'rgba(200, 128, 36, 0.22)',
    lightOrb2: 'rgba(176, 86, 114, 0.12)',
    lightIcon: '#472708',
    darkFrom: '#332718',
    darkTo: '#1F170E',
    darkGlow: 'rgba(238, 180, 92, 0.30)',
    darkIcon: '#FCF4E6',
  },
  // Kashmiri Terracotta & Clay
  {
    lightBase: '#EED7CB',
    lightOrb1: 'rgba(186, 78, 52, 0.20)',
    lightOrb2: 'rgba(208, 134, 48, 0.16)',
    lightIcon: '#4A1D12',
    darkFrom: '#36201B',
    darkTo: '#211310',
    darkGlow: 'rgba(228, 128, 98, 0.30)',
    darkIcon: '#FCEEE9',
  },
  // Cardamom & Pistachio Leaf
  {
    lightBase: '#DCE9DB',
    lightOrb1: 'rgba(68, 140, 92, 0.22)',
    lightOrb2: 'rgba(204, 142, 62, 0.14)',
    lightIcon: '#1B3424',
    darkFrom: '#1E3026',
    darkTo: '#131D17',
    darkGlow: 'rgba(118, 194, 146, 0.30)',
    darkIcon: '#E5F3EA',
  },
  // Jaipur Peacock Indigo
  {
    lightBase: '#D8E4EC',
    lightOrb1: 'rgba(56, 116, 152, 0.22)',
    lightOrb2: 'rgba(92, 150, 142, 0.14)',
    lightIcon: '#183040',
    darkFrom: '#1B2933',
    darkTo: '#111A21',
    darkGlow: 'rgba(114, 178, 214, 0.30)',
    darkIcon: '#E4F0F7',
  },
  // Pomegranate & Rosewater
  {
    lightBase: '#EEDAE2',
    lightOrb1: 'rgba(164, 68, 102, 0.20)',
    lightOrb2: 'rgba(206, 132, 86, 0.14)',
    lightIcon: '#4A1C2E',
    darkFrom: '#321F27',
    darkTo: '#1E1217',
    darkGlow: 'rgba(222, 132, 166, 0.30)',
    darkIcon: '#FAEBF0',
  },
  // Toasted Clove & Sandstone
  {
    lightBase: '#E8DEC9',
    lightOrb1: 'rgba(146, 104, 64, 0.22)',
    lightOrb2: 'rgba(196, 144, 72, 0.14)',
    lightIcon: '#3B2918',
    darkFrom: '#2F251D',
    darkTo: '#1D1712',
    darkGlow: 'rgba(214, 172, 124, 0.28)',
    darkIcon: '#F5ECE2',
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

  // Hash by title + cuisine so neighboring recipes get a lively, varied gradient palette
  const surface = MODERN_SURFACES[hashString(`${recipe.title}-${recipe.cuisine || ''}`) % MODERN_SURFACES.length];

  const surfaceVars = {
    '--ri-light-base': surface.lightBase,
    '--ri-light-icon': surface.lightIcon,
    '--ri-dark-from': surface.darkFrom,
    '--ri-dark-to': surface.darkTo,
    '--ri-dark-glow': surface.darkGlow,
    '--ri-dark-icon': surface.darkIcon,
  } as React.CSSProperties;

  if (variant === 'compact') {
    return (
      <div
        style={surfaceVars}
        className={`relative flex items-center justify-center overflow-hidden recipe-cover-surface ${className}`}
      >
        {/* Light-mode soft aurora orbs */}
        <div
          className="pointer-events-none dark:hidden absolute -top-[28%] -left-[24%] w-[85%] h-[85%] rounded-full blur-md"
          style={{ background: surface.lightOrb1 }}
        />
        <div
          className="pointer-events-none dark:hidden absolute -bottom-[28%] -right-[24%] w-[85%] h-[85%] rounded-full blur-md"
          style={{ background: surface.lightOrb2 }}
        />
        <Icon className="relative z-10 w-[42%] h-[42%] opacity-85" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div
      style={surfaceVars}
      className={`relative flex items-center justify-center overflow-hidden recipe-cover-surface ${className}`}
    >
      {/* Light-mode smooth aurora orbs & subtle depth glaze (Option E light mode) */}
      <div
        className="pointer-events-none dark:hidden absolute -top-[18%] -left-[16%] w-[78%] h-[68%] rounded-full blur-3xl"
        style={{ background: surface.lightOrb1 }}
      />
      <div
        className="pointer-events-none dark:hidden absolute -bottom-[20%] -right-[16%] w-[78%] h-[68%] rounded-full blur-3xl"
        style={{ background: surface.lightOrb2 }}
      />
      <div
        className="pointer-events-none dark:hidden absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.16) 100%)',
        }}
      />

      {/* Clean floating icon */}
      <Icon
        className="relative z-10 w-[30%] h-[30%] min-w-[54px] min-h-[54px] max-w-[92px] max-h-[92px] opacity-85"
        strokeWidth={1.3}
      />
    </div>
  );
}

