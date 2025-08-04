import React from 'react';
import { motion } from 'framer-motion';
import type { MealChoice, MenuOption } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { menuItems } from '../../data/menuItems';

interface MealSelectorProps {
  guestName: string;
  mealChoice: MealChoice;
  onChange: (mealChoice: MealChoice) => void;
  errors?: { [key: string]: string };
}

export const MealSelector: React.FC<MealSelectorProps> = ({
  guestName,
  mealChoice,
  onChange,
  errors = {}
}) => {
  const appetizers = menuItems.filter(item => item.category === 'appetizer');
  const mainCourses = menuItems.filter(item => item.category === 'main');
  const desserts = menuItems.filter(item => item.category === 'dessert');

  const handleSelectionChange = (category: keyof MealChoice, value: string) => {
    onChange({
      ...mealChoice,
      [category]: value
    });
  };

  const renderMenuSection = (
    title: string,
    items: MenuOption[],
    selectedValue: string,
    category: keyof MealChoice
  ) => (
    <div className="mb-6">
      <h4 className="text-lg font-medium text-gray-900 mb-3">{title}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <motion.label
            key={item.id}
            className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
              selectedValue === item.name
                ? 'border-rose-500 bg-rose-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <input
              type="radio"
              name={`${guestName}-${category}`}
              value={item.name}
              checked={selectedValue === item.name}
              onChange={(e) => handleSelectionChange(category, e.target.value)}
              className="mt-1 h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300"
            />
            <div className="ml-3 flex-1">
              <div className="text-sm font-medium text-gray-900">{item.name}</div>
              <div className="text-sm text-gray-600 mt-1">{item.description}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {item.isVegetarian && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Vegetarian
                  </span>
                )}
                {item.isVegan && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-900">
                    Vegan
                  </span>
                )}
                {item.isGlutenFree && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Gluten-Free
                  </span>
                )}
                {item.allergens && item.allergens.length > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Contains: {item.allergens.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </motion.label>
        ))}
      </div>
      {errors[category] && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 text-sm text-red-600"
        >
          {errors[category]}
        </motion.p>
      )}
    </div>
  );

  return (
    <Card variant="outlined" padding="lg">
      <CardHeader>
        <CardTitle>Meal Selection for {guestName}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderMenuSection('Appetizer', appetizers, mealChoice.appetizer, 'appetizer')}
        {renderMenuSection('Main Course', mainCourses, mealChoice.mainCourse, 'mainCourse')}
        {renderMenuSection('Dessert', desserts, mealChoice.dessert, 'dessert')}
      </CardContent>
    </Card>
  );
};