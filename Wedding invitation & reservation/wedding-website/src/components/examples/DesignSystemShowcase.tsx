import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HeartIcon,
  UserIcon,
  EnvelopeIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const DesignSystemShowcase: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="container section">
      {/* Typography Showcase */}
      <section className="section-compact">
        <h1 className="heading-hero text-center">Wedding Design System</h1>
        <p className="subheading text-center">
          A complete design system for elegant wedding websites
        </p>
        
        <div className="content-width">
          <div style={{ display: 'grid', gap: 'var(--space-6)', marginTop: 'var(--space-12)' }}>
            
            {/* Typography Examples */}
            <Card>
              <CardHeader>
                <CardTitle>Typography Hierarchy</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div>
                    <h1 className="heading-primary">Primary Heading</h1>
                    <p className="body-small" style={{ color: 'var(--color-gray-500)' }}>
                      heading-primary • Cormorant Garamond • Script font for romantic feel
                    </p>
                  </div>
                  
                  <div>
                    <h2 className="heading-secondary">Secondary Heading</h2>
                    <p className="body-small" style={{ color: 'var(--color-gray-500)' }}>
                      heading-secondary • Cormorant Garamond • Elegant serif for sections
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="heading-tertiary">Tertiary Heading</h3>
                    <p className="body-small" style={{ color: 'var(--color-gray-500)' }}>
                      heading-tertiary • Cormorant Garamond • Medium weight
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="heading-quaternary">Quaternary Heading</h4>
                    <p className="body-small" style={{ color: 'var(--color-gray-500)' }}>
                      heading-quaternary • Inter • Sans-serif for labels
                    </p>
                  </div>
                  
                  <div>
                    <p className="body-large">
                      Large body text for important content and introductions.
                    </p>
                    <p className="body-small" style={{ color: 'var(--color-gray-500)' }}>
                      body-large • Inter • 18px
                    </p>
                  </div>
                  
                  <div>
                    <p className="body-base">
                      Regular body text for general content and descriptions.
                    </p>
                    <p className="body-small" style={{ color: 'var(--color-gray-500)' }}>
                      body-base • Inter • 16px
                    </p>
                  </div>
                  
                  <div>
                    <p className="script-text">Beautiful script text for romantic touches</p>
                    <p className="body-small" style={{ color: 'var(--color-gray-500)' }}>
                      script-text • Dancing Script • For decorative elements
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color Palette */}
            <Card>
              <CardHeader>
                <CardTitle>Color Palette</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                  
                  {/* Rose Colors */}
                  <div>
                    <h4 className="heading-quaternary" style={{ marginBottom: 'var(--space-2)' }}>Rose (Primary)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                      {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                        <div
                          key={shade}
                          style={{
                            backgroundColor: `var(--color-rose-${shade})`,
                            padding: 'var(--space-2)',
                            color: shade >= 500 ? 'white' : 'var(--color-gray-800)',
                            fontSize: 'var(--text-sm)'
                          }}
                        >
                          {shade}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sage Colors */}
                  <div>
                    <h4 className="heading-quaternary" style={{ marginBottom: 'var(--space-2)' }}>Sage (Secondary)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                      {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                        <div
                          key={shade}
                          style={{
                            backgroundColor: `var(--color-sage-${shade})`,
                            padding: 'var(--space-2)',
                            color: shade >= 500 ? 'white' : 'var(--color-gray-800)',
                            fontSize: 'var(--text-sm)'
                          }}
                        >
                          {shade}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ivory Colors */}
                  <div>
                    <h4 className="heading-quaternary" style={{ marginBottom: 'var(--space-2)' }}>Ivory (Accent)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                      {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                        <div
                          key={shade}
                          style={{
                            backgroundColor: `var(--color-ivory-${shade})`,
                            padding: 'var(--space-2)',
                            color: shade >= 600 ? 'white' : 'var(--color-gray-800)',
                            fontSize: 'var(--text-sm)',
                            border: shade <= 200 ? '1px solid var(--color-gray-200)' : 'none'
                          }}
                        >
                          {shade}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Button Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Button Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
                  
                  {/* Button Variants */}
                  <div>
                    <h4 className="heading-quaternary" style={{ marginBottom: 'var(--space-3)' }}>Variants</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                      <Button variant="primary" leftIcon={<HeartIcon style={{ width: '1rem', height: '1rem' }} />}>
                        Primary Button
                      </Button>
                      <Button variant="secondary" rightIcon={<SparklesIcon style={{ width: '1rem', height: '1rem' }} />}>
                        Secondary Button
                      </Button>
                      <Button variant="outline">
                        Outline Button
                      </Button>
                      <Button variant="ghost">
                        Ghost Button
                      </Button>
                    </div>
                  </div>

                  {/* Button Sizes */}
                  <div>
                    <h4 className="heading-quaternary" style={{ marginBottom: 'var(--space-3)' }}>Sizes</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <Button size="sm">Small Button</Button>
                      <Button size="md">Medium Button</Button>
                      <Button size="lg">Large Button</Button>
                    </div>
                  </div>

                  {/* Button States */}
                  <div>
                    <h4 className="heading-quaternary" style={{ marginBottom: 'var(--space-3)' }}>States</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                      <Button>Normal</Button>
                      <Button disabled>Disabled</Button>
                      <Button isLoading>Loading</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Components */}
            <Card>
              <CardHeader>
                <CardTitle>Form Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: '400px' }}>
                  
                  <Input
                    label="Guest Name"
                    placeholder="Enter your full name"
                    leftIcon={<UserIcon style={{ width: '1rem', height: '1rem' }} />}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="your.email@example.com"
                    leftIcon={<EnvelopeIcon style={{ width: '1rem', height: '1rem' }} />}
                    helpText="We'll send you a confirmation email"
                  />
                  
                  <Input
                    label="Invalid Field"
                    placeholder="This field has an error"
                    error="This field is required"
                  />

                  <div className="form-group">
                    <label className="form-label">Meal Choice</label>
                    <select className="form-input form-select">
                      <option value="">Select your meal</option>
                      <option value="salmon">Grilled Salmon</option>
                      <option value="beef">Beef Tenderloin</option>
                      <option value="chicken">Herb-Crusted Chicken</option>
                      <option value="vegetarian">Vegetarian Pasta</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Special Requests</label>
                    <textarea 
                      className="form-input form-textarea"
                      placeholder="Any special requests or dietary restrictions?"
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Variants */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
              <Card variant="default">
                <CardHeader>
                  <CardTitle>Default Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>This is a default card with standard styling and shadow.</p>
                </CardContent>
                <CardFooter>
                  <Button size="sm">Action</Button>
                </CardFooter>
              </Card>

              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Elevated Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>This card has elevated styling with a larger shadow.</p>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="secondary">Action</Button>
                </CardFooter>
              </Card>

              <Card variant="outlined">
                <CardHeader>
                  <CardTitle>Outlined Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>This card uses a border instead of a shadow.</p>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="outline">Action</Button>
                </CardFooter>
              </Card>
            </div>

            {/* Loading States */}
            <Card>
              <CardHeader>
                <CardTitle>Loading Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)' }}>
                  
                  <div style={{ textAlign: 'center' }}>
                    <h4 className="heading-quaternary" style={{ marginBottom: 'var(--space-3)' }}>Spinner Sizes</h4>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-4)' }}>
                      <LoadingSpinner size="sm" />
                      <LoadingSpinner size="md" />
                      <LoadingSpinner size="lg" />
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <h4 className="heading-quaternary" style={{ marginBottom: 'var(--space-3)' }}>With Text</h4>
                    <LoadingSpinner text="Loading RSVP..." />
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <h4 className="heading-quaternary" style={{ marginBottom: 'var(--space-3)' }}>Color Variants</h4>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)' }}>
                      <LoadingSpinner color="primary" />
                      <LoadingSpinner color="secondary" />
                      <LoadingSpinner color="gray" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Animation Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Animation Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                  
                  <div className="animate-fade-in" style={{ 
                    padding: 'var(--space-4)', 
                    backgroundColor: 'var(--color-primary-light)', 
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center'
                  }}>
                    <p className="body-base">Fade In Animation</p>
                    <p className="body-small">animate-fade-in</p>
                  </div>

                  <div className="animate-slide-left" style={{ 
                    padding: 'var(--space-4)', 
                    backgroundColor: 'var(--color-secondary-light)', 
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center'
                  }}>
                    <p className="body-base">Slide Left Animation</p>
                    <p className="body-small">animate-slide-left</p>
                  </div>

                  <div className="animate-slide-right" style={{ 
                    padding: 'var(--space-4)', 
                    backgroundColor: 'var(--color-accent-light)', 
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center'
                  }}>
                    <p className="body-base">Slide Right Animation</p>
                    <p className="body-small">animate-slide-right</p>
                  </div>

                  <div className="animate-float" style={{ 
                    padding: 'var(--space-4)', 
                    backgroundColor: 'var(--color-primary-light)', 
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center'
                  }}>
                    <HeartIcon style={{ width: '2rem', height: '2rem', margin: '0 auto', color: 'var(--color-primary)' }} />
                    <p className="body-small">Float Animation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>
    </div>
  );
};

export default DesignSystemShowcase;