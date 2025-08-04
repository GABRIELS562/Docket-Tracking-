import { motion } from 'framer-motion';
import { CheckCircleIcon, StarIcon } from '@heroicons/react/24/solid';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface MealOption {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  chefNote?: string;
  image: string;
  badges: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    dairyFree?: boolean;
    nutFree?: boolean;
  };
  allergens: string[];
  price?: string;
  recommended?: boolean;
}

interface MealSelectionProps {
  guestName: string;
  selectedMeal: string;
  onMealSelect: (mealId: string) => void;
  dietaryRestrictions: string;
  onDietaryChange: (restrictions: string) => void;
  isPlusOne?: boolean;
  className?: string;
}

const mealOptions: MealOption[] = [
  {
    id: 'filet-mignon',
    name: 'Herb-Crusted Filet Mignon',
    description: 'Premium 8oz grass-fed beef tenderloin with rosemary and thyme crust',
    ingredients: [
      'Grass-fed beef tenderloin',
      'Fresh herbs (rosemary, thyme, parsley)',
      'Roasted fingerling potatoes',
      'Seasonal vegetables',
      'Red wine reduction'
    ],
    chefNote: 'Our signature dish, aged 28 days and cooked to perfection',
    image: '/images/meals/filet-mignon.jpg',
    badges: {
      glutenFree: true,
      dairyFree: false,
      nutFree: true
    },
    allergens: ['Contains: Dairy (butter sauce)'],
    recommended: true
  },
  {
    id: 'atlantic-salmon',
    name: 'Pan-Seared Atlantic Salmon',
    description: 'Fresh Atlantic salmon with lemon butter sauce and dill',
    ingredients: [
      'Fresh Atlantic salmon fillet',
      'Lemon butter sauce',
      'Fresh dill and capers',
      'Wild rice pilaf',
      'Grilled asparagus'
    ],
    chefNote: 'Sustainably sourced and served with our signature citrus glaze',
    image: '/images/meals/salmon.jpg',
    badges: {
      glutenFree: true,
      dairyFree: false,
      nutFree: true
    },
    allergens: ['Contains: Fish', 'Contains: Dairy (butter sauce)']
  },
  {
    id: 'free-range-chicken',
    name: 'Free-Range Chicken Breast',
    description: 'Herb-marinated chicken breast with white wine pan sauce',
    ingredients: [
      'Free-range chicken breast',
      'Mediterranean herb marinade',
      'White wine pan sauce',
      'Garlic mashed potatoes',
      'Sautéed green beans'
    ],
    chefNote: 'Marinated for 24 hours in our signature herb blend',
    image: '/images/meals/chicken.jpg',
    badges: {
      glutenFree: true,
      dairyFree: false,
      nutFree: true
    },
    allergens: ['Contains: Dairy (mashed potatoes, sauce)']
  },
  {
    id: 'vegetarian-wellington',
    name: 'Roasted Vegetable Wellington',
    description: 'Layers of roasted vegetables and herbs in flaky puff pastry',
    ingredients: [
      'Puff pastry',
      'Roasted portobello mushrooms',
      'Caramelized onions',
      'Spinach and herbs',
      'Quinoa and herb stuffing',
      'Mushroom gravy'
    ],
    chefNote: 'A hearty and satisfying plant-based centerpiece',
    image: '/images/meals/wellington.jpg',
    badges: {
      vegetarian: true,
      nutFree: true
    },
    allergens: ['Contains: Gluten (pastry)', 'Contains: Eggs (pastry)']
  },
  {
    id: 'vegan-bowl',
    name: 'Mediterranean Vegan Bowl',
    description: 'Nourishing bowl with quinoa, roasted vegetables, and tahini dressing',
    ingredients: [
      'Organic quinoa',
      'Roasted seasonal vegetables',
      'Chickpeas and lentils',
      'Fresh herbs and greens',
      'House-made tahini dressing',
      'Toasted seeds and nuts'
    ],
    chefNote: 'Packed with plant-based protein and vibrant flavors',
    image: '/images/meals/vegan-bowl.jpg',
    badges: {
      vegan: true,
      glutenFree: true,
      dairyFree: true
    },
    allergens: ['Contains: Sesame (tahini)', 'Contains: Tree nuts']
  }
];

const MealSelection: React.FC<MealSelectionProps> = ({
  guestName,
  selectedMeal,
  onMealSelect,
  dietaryRestrictions,
  onDietaryChange,
  isPlusOne = false,
  className = ''
}) => {
  const getBadgeColor = (badge: string) => {
    const colors: { [key: string]: string } = {
      vegetarian: 'bg-green-100 text-green-800 border-green-200',
      vegan: 'bg-green-100 text-green-800 border-green-200',
      glutenFree: 'bg-blue-100 text-blue-800 border-blue-200',
      dairyFree: 'bg-purple-100 text-purple-800 border-purple-200',
      nutFree: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[badge] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatBadgeName = (badge: string) => {
    const names: { [key: string]: string } = {
      vegetarian: 'Vegetarian',
      vegan: 'Vegan',
      glutenFree: 'Gluten-Free',
      dairyFree: 'Dairy-Free',
      nutFree: 'Nut-Free'
    };
    return names[badge] || badge;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-2">
          {isPlusOne ? `${guestName}'s Meal Selection` : 'Your Meal Selection'}
        </h4>
        <p className="text-gray-600 text-sm">
          Choose one delicious option from our carefully curated menu
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
      >
        {mealOptions.map((meal) => {
          const isSelected = selectedMeal === meal.id;
          
          return (
            <motion.label
              key={meal.id}
              variants={cardVariants}
              className={`relative cursor-pointer group meal-card ${
                isSelected ? 'ring-2 ring-rose-500 meal-card-selected' : ''
              }`}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <input
                type="radio"
                name={`meal-${isPlusOne ? 'plusone' : 'primary'}`}
                value={meal.id}
                checked={isSelected}
                onChange={() => onMealSelect(meal.id)}
                className="sr-only"
                aria-describedby={`${meal.id}-description`}
              />
              
              <div className={`relative bg-white rounded-xl shadow-lg overflow-hidden border-2 transition-all duration-200 ${
                isSelected 
                  ? 'border-rose-500 shadow-xl' 
                  : 'border-gray-200 group-hover:border-gray-300 group-hover:shadow-xl'
              }`}>
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 z-10">
                    <CheckCircleIcon className="h-6 w-6 text-rose-500 bg-white rounded-full" />
                  </div>
                )}

                {/* Recommended Badge */}
                {meal.recommended && (
                  <div className="absolute top-3 left-3 z-10">
                    <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                      <StarIcon className="h-3 w-3 mr-1" />
                      Chef's Choice
                    </div>
                  </div>
                )}

                {/* Food Image */}
                <div className="meal-image-container relative h-48 bg-gray-200 overflow-hidden">
                  <img
                    src={meal.image}
                    alt={`${meal.name} - beautifully plated dish featuring ${meal.ingredients[0]}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      // Fallback for missing images
                      e.currentTarget.src = '/images/meals/placeholder.jpg';
                    }}
                  />
                </div>

                {/* Content */}
                <div className="p-4">
                  <h5 className="font-semibold text-gray-800 mb-2 text-lg">
                    {meal.name}
                  </h5>
                  
                  <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                    {meal.description}
                  </p>

                  {/* Chef's Note */}
                  {meal.chefNote && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-700 italic">
                        <span className="font-medium">Chef's Note:</span> {meal.chefNote}
                      </p>
                    </div>
                  )}

                  {/* Dietary Badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {Object.entries(meal.badges).map(([badge, isTrue]) => 
                      isTrue && (
                        <span
                          key={badge}
                          className={`dietary-badge px-2 py-1 text-xs font-medium rounded-full border ${getBadgeColor(badge)}`}
                        >
                          {formatBadgeName(badge)}
                        </span>
                      )
                    )}
                  </div>

                  {/* Ingredients */}
                  <div className="mb-3">
                    <h6 className="text-xs font-medium text-gray-700 mb-1">Ingredients:</h6>
                    <ul className="ingredients-list text-xs text-gray-600 space-y-0.5">
                      {meal.ingredients.slice(0, 3).map((ingredient, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                          {ingredient}
                        </li>
                      ))}
                      {meal.ingredients.length > 3 && (
                        <li className="text-gray-500 italic">
                          +{meal.ingredients.length - 3} more ingredients
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Allergen Information */}
                  {meal.allergens.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex items-start">
                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <h6 className="text-xs font-medium text-gray-700 mb-1">
                            Allergen Information:
                          </h6>
                          <ul className="text-xs text-gray-600 space-y-0.5">
                            {meal.allergens.map((allergen, index) => (
                              <li key={index}>{allergen}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.label>
          );
        })}
      </motion.div>

      {/* Dietary Restrictions Text Area */}
      <div className="bg-gray-50 rounded-xl p-4">
        <label 
          className="block text-sm font-medium text-gray-700 mb-2"
          htmlFor={`dietary-${isPlusOne ? 'plusone' : 'primary'}`}
        >
          {isPlusOne ? `${guestName}'s Dietary Restrictions` : 'Your Dietary Restrictions'} (Optional)
        </label>
        <textarea
          id={`dietary-${isPlusOne ? 'plusone' : 'primary'}`}
          value={dietaryRestrictions}
          onChange={(e) => onDietaryChange(e.target.value)}
          placeholder="Please let us know about any allergies, dietary restrictions, or special requests..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
          aria-describedby={`dietary-help-${isPlusOne ? 'plusone' : 'primary'}`}
        />
        <p 
          id={`dietary-help-${isPlusOne ? 'plusone' : 'primary'}`}
          className="mt-1 text-xs text-gray-500"
        >
          Include any allergies, intolerances, or specific dietary needs. Our chef will accommodate all requests.
        </p>
      </div>
    </div>
  );
};

export default MealSelection;