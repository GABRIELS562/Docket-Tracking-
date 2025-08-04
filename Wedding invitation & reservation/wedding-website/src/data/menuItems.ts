import type { MenuOption } from '../types';

export const menuItems: MenuOption[] = [
  {
    id: 'app-1',
    name: 'Bruschetta Trio',
    description: 'Three varieties of bruschetta with fresh tomatoes, basil, and balsamic glaze',
    category: 'appetizer',
    isVegetarian: true,
    allergens: ['gluten']
  },
  {
    id: 'app-2',
    name: 'Bacon-Wrapped Scallops',
    description: 'Pan-seared scallops wrapped in crispy bacon with lemon butter sauce',
    category: 'appetizer',
    allergens: ['shellfish']
  },
  {
    id: 'app-3',
    name: 'Stuffed Mushrooms',
    description: 'Button mushrooms stuffed with herbed cream cheese and breadcrumbs',
    category: 'appetizer',
    isVegetarian: true,
    allergens: ['dairy', 'gluten']
  },
  {
    id: 'app-4',
    name: 'Shrimp Cocktail',
    description: 'Chilled jumbo shrimp served with house-made cocktail sauce',
    category: 'appetizer',
    allergens: ['shellfish']
  },
  {
    id: 'main-1',
    name: 'Herb-Crusted Filet Mignon',
    description: '8oz filet mignon with herb crust, roasted vegetables, and red wine reduction',
    category: 'main',
    allergens: []
  },
  {
    id: 'main-2',
    name: 'Pan-Seared Salmon',
    description: 'Atlantic salmon with lemon dill sauce, wild rice, and seasonal vegetables',
    category: 'main',
    allergens: ['fish']
  },
  {
    id: 'main-3',
    name: 'Chicken Marsala',
    description: 'Sautéed chicken breast with mushroom marsala sauce and garlic mashed potatoes',
    category: 'main',
    allergens: ['dairy']
  },
  {
    id: 'main-4',
    name: 'Vegetarian Wellington',
    description: 'Roasted vegetables and mushrooms wrapped in puff pastry with herb gravy',
    category: 'main',
    isVegetarian: true,
    allergens: ['gluten', 'dairy']
  },
  {
    id: 'main-5',
    name: 'Lobster Risotto',
    description: 'Creamy arborio rice with fresh lobster, asparagus, and parmesan',
    category: 'main',
    allergens: ['shellfish', 'dairy']
  },
  {
    id: 'main-6',
    name: 'Vegan Buddha Bowl',
    description: 'Quinoa bowl with roasted vegetables, avocado, and tahini dressing',
    category: 'main',
    isVegan: true,
    isVegetarian: true,
    allergens: ['sesame']
  },
  {
    id: 'dessert-1',
    name: 'Wedding Cake',
    description: 'Three-layer vanilla cake with raspberry filling and buttercream frosting',
    category: 'dessert',
    isVegetarian: true,
    allergens: ['gluten', 'dairy', 'eggs']
  },
  {
    id: 'dessert-2',
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with molten center, served with vanilla ice cream',
    category: 'dessert',
    isVegetarian: true,
    allergens: ['gluten', 'dairy', 'eggs']
  },
  {
    id: 'dessert-3',
    name: 'Tiramisu',
    description: 'Classic Italian dessert with mascarpone, ladyfingers, and espresso',
    category: 'dessert',
    isVegetarian: true,
    allergens: ['gluten', 'dairy', 'eggs']
  },
  {
    id: 'dessert-4',
    name: 'Fresh Berry Tart',
    description: 'Vanilla custard tart topped with seasonal fresh berries',
    category: 'dessert',
    isVegetarian: true,
    allergens: ['gluten', 'dairy', 'eggs']
  },
  {
    id: 'dessert-5',
    name: 'Gelato Selection',
    description: 'Choose from vanilla, chocolate, or strawberry artisanal gelato',
    category: 'dessert',
    isVegetarian: true,
    allergens: ['dairy']
  },
  {
    id: 'dessert-6',
    name: 'Vegan Chocolate Mousse',
    description: 'Rich chocolate mousse made with coconut cream and dark chocolate',
    category: 'dessert',
    isVegan: true,
    isVegetarian: true,
    allergens: []
  }
];