import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Simple components for testing
const Navigation = () => (
  <nav className="fixed top-0 w-full bg-white shadow-md z-50">
    <div className="container mx-auto px-4 py-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Sarah & Michael</h1>
        <div className="flex space-x-6">
          <a href="#details" className="text-gray-600 hover:text-gray-800">Details</a>
          <a href="#location" className="text-gray-600 hover:text-gray-800">Location</a>
          <a href="#rsvp" className="text-gray-600 hover:text-gray-800">RSVP</a>
        </div>
      </div>
    </div>
  </nav>
);

const HeroSection = () => (
  <section id="hero" className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-white">
    <div className="text-center px-4">
      <h1 className="text-6xl font-bold text-gray-800 mb-4">Sarah & Michael</h1>
      <p className="text-2xl text-gray-600 mb-8">We're Getting Married!</p>
      <p className="text-xl text-gray-500">June 15, 2024</p>
    </div>
  </section>
);

const DetailsSection = () => (
  <section id="details" className="py-20 bg-white">
    <div className="container mx-auto px-4">
      <h2 className="text-4xl font-bold text-center mb-16">Wedding Details</h2>
      <div className="grid md:grid-cols-2 gap-12">
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-4">Ceremony</h3>
          <p className="text-gray-600 mb-2">4:00 PM</p>
          <p className="text-gray-600">Sunset Gardens</p>
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-4">Reception</h3>
          <p className="text-gray-600 mb-2">6:00 PM</p>
          <p className="text-gray-600">Grand Ballroom</p>
        </div>
      </div>
    </div>
  </section>
);

const LocationSection = () => (
  <section id="location" className="py-20 bg-gray-50">
    <div className="container mx-auto px-4">
      <h2 className="text-4xl font-bold text-center mb-16">Location</h2>
      <div className="text-center">
        <h3 className="text-2xl font-semibold mb-4">Sunset Gardens & Grand Ballroom</h3>
        <p className="text-gray-600 mb-4">123 Wedding Lane, Love City, LC 12345</p>
        <button className="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600">
          Get Directions
        </button>
      </div>
    </div>
  </section>
);

const RSVPSection = () => (
  <section id="rsvp" className="py-20 bg-white">
    <div className="container mx-auto px-4">
      <h2 className="text-4xl font-bold text-center mb-16">RSVP</h2>
      <div className="max-w-md mx-auto">
        <form className="space-y-6">
          <div>
            <label className="block text-gray-700 mb-2">Your Name</label>
            <input 
              type="text" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Email</label>
            <input 
              type="email" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Will you attend?</label>
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500">
              <option>Yes, I'll be there!</option>
              <option>Sorry, can't make it</option>
            </select>
          </div>
          <button 
            type="submit" 
            className="w-full bg-pink-500 text-white py-3 rounded-lg hover:bg-pink-600 font-semibold"
          >
            Send RSVP
          </button>
        </form>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-gray-800 text-white py-8">
    <div className="container mx-auto px-4 text-center">
      <p>&copy; 2024 Sarah & Michael's Wedding. Made with ❤️</p>
    </div>
  </footer>
);

const SimpleWeddingWebsite = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <HeroSection />
        <DetailsSection />
        <LocationSection />
        <RSVPSection />
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SimpleWeddingWebsite />} />
        <Route path="/guest/:token" element={<SimpleWeddingWebsite />} />
      </Routes>
    </Router>
  );
}

export default App;