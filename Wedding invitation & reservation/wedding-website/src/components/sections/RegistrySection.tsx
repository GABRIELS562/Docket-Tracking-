import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HeartIcon,
  GiftIcon,
  MapPinIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import { weddingInfo } from '../../data/weddingInfo';

const RegistrySection = () => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(type);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleExternalLink = (url: string, storeName: string) => {
    // Track external link clicks (can be connected to analytics)
    console.log(`Registry link clicked: ${storeName}`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };


  const registryStores = Array.from(new Set(weddingInfo.registry.map(item => item.store)))
    .map(store => ({
      name: store,
      items: weddingInfo.registry.filter(item => item.store === store),
      description: getStoreDescription(store),
      logo: getStoreLogo(store),
      primaryUrl: weddingInfo.registry.find(item => item.store === store)?.url || '#'
    }));

  function getStoreDescription(store: string): string {
    const descriptions: { [key: string]: string } = {
      'Williams Sonoma': 'Premium kitchen and home essentials for creating beautiful meals and memorable moments together.',
      'Sur La Table': 'Professional-quality cookware and culinary tools to inspire our cooking adventures.',
      'Pottery Barn': 'Timeless home furnishings and décor to make our house a warm and welcoming home.',
      'West Elm': 'Modern furniture and accessories that reflect our contemporary style.',
      'Target': 'Everyday essentials and practical items for our new life together.',
      'Amazon': 'Convenient online shopping for a wide variety of household needs and wishes.'
    };
    return descriptions[store] || 'Carefully selected items to help us start our new life together.';
  }

  function getStoreLogo(store: string): string {
    // In a real implementation, these would be actual logo URLs
    const logos: { [key: string]: string } = {
      'Williams Sonoma': '/images/logos/williams-sonoma.png',
      'Sur La Table': '/images/logos/sur-la-table.png',
      'Pottery Barn': '/images/logos/pottery-barn.png',
      'West Elm': '/images/logos/west-elm.png',
      'Target': '/images/logos/target.png',
      'Amazon': '/images/logos/amazon.png'
    };
    return logos[store] || '/images/logos/default-store.png';
  }

  return (
    <section id="registry" className="py-16 lg:py-24 bg-gradient-to-br from-rose-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-16"
        >
          <motion.div
            variants={itemVariants}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <HeartIcon className="h-12 w-12 text-rose-400" />
              <GiftIcon className="h-6 w-6 text-rose-600 absolute -bottom-1 -right-1" />
            </div>
          </motion.div>
          
          <motion.h2 
            variants={itemVariants}
            className="text-3xl lg:text-4xl font-serif text-gray-800 mb-4"
          >
            Gift Registry
          </motion.h2>
          
          <motion.div 
            variants={itemVariants}
            className="max-w-3xl mx-auto space-y-4"
          >
            <p className="text-xl text-gray-700 font-medium">
              Your Presence is Our Present
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              While your presence at our wedding is the greatest gift of all, if you wish to honor us with a gift, 
              we've created a registry of items that will help us build our new home together. We're grateful for 
              your love and support as we begin this beautiful journey.
            </p>
          </motion.div>
        </motion.div>

        {/* Registry Stores */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mb-16"
        >
          <motion.h3 
            variants={itemVariants}
            className="text-2xl font-serif text-gray-800 text-center mb-8"
          >
            Our Registries
          </motion.h3>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {registryStores.map((store) => (
              <motion.div 
                key={store.name}
                variants={itemVariants}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                <div className="p-6">
                  {/* Store Logo/Header */}
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                      <GiftIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-800 group-hover:text-rose-600 transition-colors">
                        {store.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {store.items.length} {store.items.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                    {store.description}
                  </p>

                  {/* Featured Items Preview */}
                  <div className="mb-6">
                    <div className="space-y-2">
                      {store.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 truncate flex-1 mr-2">
                            {item.name}
                          </span>
                          <span className="text-gray-500 font-medium">
                            ${item.price}
                          </span>
                        </div>
                      ))}
                      {store.items.length > 3 && (
                        <p className="text-xs text-gray-500 italic">
                          +{store.items.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>

                  {/* View Registry Button */}
                  <button
                    onClick={() => handleExternalLink(store.primaryUrl, store.name)}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center group"
                  >
                    View Registry
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Cash Gifts */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mb-16"
        >
          <motion.h3 
            variants={itemVariants}
            className="text-2xl font-serif text-gray-800 text-center mb-8"
          >
            Other Ways to Give
          </motion.h3>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {weddingInfo.cashGifts.map((cashGift) => (
              <motion.div 
                key={cashGift.id}
                variants={itemVariants}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300"
              >
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">{cashGift.icon}</div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    {cashGift.name}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {cashGift.description}
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {cashGift.instructions}
                  </p>

                  {cashGift.accountInfo && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      {cashGift.accountInfo.username && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Username:</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-mono text-gray-800">
                              {cashGift.accountInfo.username}
                            </span>
                            <button
                              onClick={() => copyToClipboard(cashGift.accountInfo!.username!, `${cashGift.type}-username`)}
                              className="text-rose-600 hover:text-rose-700 p-1"
                              title="Copy username"
                            >
                              {copiedItem === `${cashGift.type}-username` ? (
                                <CheckIcon className="h-4 w-4" />
                              ) : (
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {cashGift.accountInfo.email && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-600">Email:</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-mono text-gray-800">
                              {cashGift.accountInfo.email}
                            </span>
                            <button
                              onClick={() => copyToClipboard(cashGift.accountInfo!.email!, `${cashGift.type}-email`)}
                              className="text-rose-600 hover:text-rose-700 p-1"
                              title="Copy email"
                            >
                              {copiedItem === `${cashGift.type}-email` ? (
                                <CheckIcon className="h-4 w-4" />
                              ) : (
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Alternative Gift Ideas */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mb-16"
        >
          <motion.h3 
            variants={itemVariants}
            className="text-2xl font-serif text-gray-800 text-center mb-8"
          >
            Alternative Gift Ideas
          </motion.h3>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-6 text-center border border-gray-100">
              <div className="text-2xl mb-4">📚</div>
              <h4 className="font-semibold text-gray-800 mb-2">Recipe Collection</h4>
              <p className="text-sm text-gray-600">
                Share your favorite family recipes to help us build our cookbook
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-6 text-center border border-gray-100">
              <div className="text-2xl mb-4">🌱</div>
              <h4 className="font-semibold text-gray-800 mb-2">Charitable Donation</h4>
              <p className="text-sm text-gray-600">
                Make a donation to your favorite charity in honor of our marriage
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-6 text-center border border-gray-100">
              <div className="text-2xl mb-4">📝</div>
              <h4 className="font-semibold text-gray-800 mb-2">Marriage Advice</h4>
              <p className="text-sm text-gray-600">
                Share your wisdom and best marriage advice for our guest book
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-6 text-center border border-gray-100">
              <div className="text-2xl mb-4">🎨</div>
              <h4 className="font-semibold text-gray-800 mb-2">Handmade Gifts</h4>
              <p className="text-sm text-gray-600">
                Create something special with your own hands and heart
              </p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Shipping Information */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mb-16"
        >
          <motion.div 
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Shipping Address */}
              <div>
                <div className="flex items-center mb-4">
                  <HomeIcon className="h-6 w-6 text-rose-500 mr-3" />
                  <h4 className="text-xl font-semibold text-gray-800">Shipping Address</h4>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-1 text-gray-700">
                    <p className="font-medium">{weddingInfo.bride.fullName} & {weddingInfo.groom.fullName}</p>
                    <p>{weddingInfo.importantInfo.gifts.homeAddress}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(
                      `${weddingInfo.bride.fullName} & ${weddingInfo.groom.fullName}\n${weddingInfo.importantInfo.gifts.homeAddress}`, 
                      'shipping-address'
                    )}
                    className="mt-3 text-rose-600 hover:text-rose-700 text-sm font-medium flex items-center"
                  >
                    {copiedItem === 'shipping-address' ? (
                      <>
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                        Copy Address
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Gift Delivery Info */}
              <div>
                <div className="flex items-center mb-4">
                  <MapPinIcon className="h-6 w-6 text-rose-500 mr-3" />
                  <h4 className="text-xl font-semibold text-gray-800">Delivery Information</h4>
                </div>
                <div className="space-y-3 text-gray-700">
                  <p className="text-sm leading-relaxed">
                    {weddingInfo.importantInfo.gifts.registryNotes}
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Wedding Date:</strong> {weddingInfo.date.ceremony.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Please plan gift deliveries accordingly
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Thank You Message */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <motion.div 
            variants={itemVariants}
            className="text-center bg-gradient-to-r from-rose-100 to-pink-100 rounded-2xl p-8 lg:p-12 border border-rose-200"
          >
            <HeartIcon className="h-12 w-12 text-rose-500 mx-auto mb-6" />
            <h3 className="text-2xl lg:text-3xl font-serif text-gray-800 mb-4">
              With Gratitude
            </h3>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Thank you for taking the time to celebrate with us and for your thoughtful generosity. 
              Your love and support mean everything to us as we begin this new chapter of our lives together. 
              We can't wait to share our special day with you!
            </p>
            <div className="mt-6">
              <p className="text-gray-600 font-medium">
                With all our love,
              </p>
              <p className="text-xl font-serif text-gray-800 mt-2">
                {weddingInfo.bride.name} & {weddingInfo.groom.name}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default RegistrySection;