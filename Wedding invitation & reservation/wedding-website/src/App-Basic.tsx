import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const WeddingWebsite = () => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Navigation */}
      <nav style={{ 
        position: 'fixed', 
        top: 0, 
        width: '100%', 
        backgroundColor: 'white', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        zIndex: 1000,
        padding: '1rem 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>Sarah & Michael</h1>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <a href="#details" style={{ textDecoration: 'none', color: '#666' }}>Details</a>
            <a href="#location" style={{ textDecoration: 'none', color: '#666' }}>Location</a>
            <a href="#rsvp" style={{ textDecoration: 'none', color: '#666' }}>RSVP</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'linear-gradient(to bottom, #fdf2f8, white)',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '4rem', margin: '0 0 1rem 0', color: '#333' }}>Sarah & Michael</h1>
          <p style={{ fontSize: '1.5rem', margin: '0 0 2rem 0', color: '#666' }}>We're Getting Married!</p>
          <p style={{ fontSize: '1.25rem', color: '#999' }}>June 15, 2024</p>
        </div>
      </section>

      {/* Details Section */}
      <section id="details" style={{ padding: '5rem 1rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '4rem', color: '#333' }}>Wedding Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>Ceremony</h3>
              <p style={{ color: '#666', margin: '0.5rem 0' }}>4:00 PM</p>
              <p style={{ color: '#666', margin: '0.5rem 0' }}>Sunset Gardens</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>Reception</h3>
              <p style={{ color: '#666', margin: '0.5rem 0' }}>6:00 PM</p>
              <p style={{ color: '#666', margin: '0.5rem 0' }}>Grand Ballroom</p>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section id="location" style={{ padding: '5rem 1rem', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '4rem', color: '#333' }}>Location</h2>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>Sunset Gardens & Grand Ballroom</h3>
          <p style={{ color: '#666', marginBottom: '2rem' }}>123 Wedding Lane, Love City, LC 12345</p>
          <button style={{ 
            backgroundColor: '#ec4899', 
            color: 'white', 
            padding: '0.75rem 1.5rem', 
            border: 'none', 
            borderRadius: '0.5rem', 
            fontSize: '1rem',
            cursor: 'pointer'
          }}>
            Get Directions
          </button>
        </div>
      </section>

      {/* RSVP Section */}
      <section id="rsvp" style={{ padding: '5rem 1rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '4rem', color: '#333' }}>RSVP</h2>
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Your Name</label>
                <input 
                  type="text" 
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Email</label>
                <input 
                  type="email" 
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Will you attend?</label>
                <select style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}>
                  <option>Yes, I'll be there!</option>
                  <option>Sorry, can't make it</option>
                </select>
              </div>
              <button 
                type="submit" 
                style={{ 
                  width: '100%', 
                  backgroundColor: '#ec4899', 
                  color: 'white', 
                  padding: '0.75rem', 
                  border: 'none', 
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Send RSVP
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#1f2937', color: 'white', padding: '2rem 1rem', textAlign: 'center' }}>
        <p>&copy; 2024 Sarah & Michael's Wedding. Made with ❤️</p>
      </footer>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WeddingWebsite />} />
        <Route path="/guest/:token" element={<WeddingWebsite />} />
      </Routes>
    </Router>
  );
}

export default App;