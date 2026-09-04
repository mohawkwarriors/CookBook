import * as lucide from 'lucide-react';
const toCheck = ['Shrimp', 'Popcorn', 'Fish', 'FishSymbol', 'Crab', 'Lobster', 'Beef', 'Meat', 'Pork', 'Bacon', 'Cookie', 'Croissant', 'Donut', 'IceCream', 'IceCreamBowl', 'Cake', 'Cupcake', 'Candy', 'Lollipop', 'Apple', 'Banana', 'Cherry', 'Citrus', 'Grape', 'Strawberry', 'Carrot', 'Mushroom', 'Salad', 'Soup', 'Pizza', 'Sandwich', 'Burger', 'HotDog', 'Taco', 'FrenchFries', 'Drumstick', 'Egg', 'Cheese', 'Nut', 'Popcorn', 'Bowl', 'Milk', 'Coffee', 'Tea', 'Beer', 'Wine', 'Martini', 'GlassWater', 'CupSoda'];
const found = toCheck.filter(k => k in lucide);
const missing = toCheck.filter(k => !(k in lucide));
console.log("Found:", found);
console.log("Missing:", missing);
