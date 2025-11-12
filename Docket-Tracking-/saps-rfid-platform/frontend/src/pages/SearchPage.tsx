import { Search } from 'lucide-react';

const SearchPage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Search Items</h1>
        <p className="text-gray-600 mt-1">
          Find and locate items across all zones with autocomplete
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-3xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by EPC, description, zone, or category..."
            className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Search Results Placeholder */}
        <div className="mt-8">
          <div className="text-center py-12 text-gray-500">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Start typing to search items</p>
            <p className="text-sm mt-2">OpenSearch autocomplete integration coming next</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
