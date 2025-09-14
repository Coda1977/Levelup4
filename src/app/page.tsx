'use client'

import { useEffect, useRef, useState } from 'react'

function useScrollFadeIn(): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, isVisible];
}

export default function Home() {
  const [heroRef, heroVisible] = useScrollFadeIn();
  const [featuresRef, featuresVisible] = useScrollFadeIn();
  const [designRef, designVisible] = useScrollFadeIn();

  return (
    <div style={{backgroundColor: 'var(--bg-primary)'}}>
      {/* Hero Section */}
      <section ref={heroRef} className={`relative py-20 md:py-32 px-5 md:px-10 overflow-hidden transition-opacity duration-700 ${heroVisible ? 'animate-fade-in opacity-100' : 'opacity-0'}`}>
        {/* Geometric Background Shapes */}
        <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
          <div className="absolute top-20 right-10 w-32 h-32 opacity-20 transform rotate-45 rounded-2xl" style={{backgroundColor: 'var(--accent-yellow)'}}></div>
          <div className="absolute bottom-32 left-16 w-24 h-24 opacity-15 rounded-full" style={{backgroundColor: 'var(--accent-blue)'}}></div>
          <div className="absolute top-1/3 left-1/4 w-16 h-16 opacity-10 transform rotate-12" style={{backgroundColor: 'var(--accent-yellow)'}}></div>
          <svg className="absolute bottom-20 right-20 w-40 h-40 opacity-10" viewBox="0 0 100 100">
            <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="var(--accent-blue)" />
          </svg>
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 text-left">
              <h1 className="hero-headline mb-8" style={{color: 'var(--text-primary)'}}>
                Transforming Insight<br />into Action
              </h1>
              <button
                onClick={() => window.location.href = "/learn"}
                className="hover-lift px-10 py-4 rounded-full font-semibold text-lg transition-all duration-300"
                style={{backgroundColor: 'var(--accent-blue)', color: 'var(--bg-primary)'}}
              >
                Get Started
              </button>
            </div>
            <div className="flex-1 flex justify-center lg:justify-end">
              <div className="hover-lift p-12 rounded-2xl transition-all duration-300" style={{backgroundColor: 'var(--white)'}}>
                {/* Placeholder for hand-drawn cube - using CSS to create a simple cube */}
                <div className="w-48 h-48 md:w-64 md:h-64 relative">
                  <div className="absolute inset-0 border-4 border-gray-300 rounded-lg transform rotate-12" style={{backgroundColor: '#f8f8f8'}}></div>
                  <div className="absolute inset-2 border-2 border-gray-400 rounded transform -rotate-6" style={{backgroundColor: '#e8e8e8'}}></div>
                  <div className="absolute inset-4 border border-gray-500 rounded transform rotate-3" style={{backgroundColor: '#d8d8d8'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section (Midsection) */}
      <section ref={featuresRef} className={`py-24 md:py-32 px-5 md:px-10 flex flex-col items-center text-center transition-opacity duration-700 ${featuresVisible ? 'animate-fade-in opacity-100' : 'opacity-0'}`} style={{backgroundColor: 'var(--white)'}}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-[clamp(36px,5.5vw,52px)] font-bold tracking-tight leading-tight mb-8" style={{color: 'var(--text-primary)'}}>
              No more "What was that tool again?"
            </h1>
          </div>
          
          <div className="mb-12">
            <h2 className="text-[clamp(28px,4.5vw,38px)] font-semibold mb-3 leading-tight" style={{color: 'var(--text-primary)'}}>
              You've completed the training.
            </h2>
            <h2 className="text-[clamp(28px,4.5vw,38px)] font-bold leading-tight" style={{color: 'var(--accent-blue)'}}>
              Now make it stick.
            </h2>
          </div>
          
          <div className="p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100" style={{backgroundColor: 'var(--bg-primary)'}}>
            <p className="text-xl md:text-2xl font-medium leading-relaxed mb-4" style={{color: 'var(--text-primary)'}}>
              Level Up transforms management insights into daily practice
            </p>
            <p className="text-lg leading-relaxed" style={{color: 'var(--text-secondary)'}}>
              Build the leadership habits that make a lasting impact on your team and organization.
            </p>
          </div>
        </div>
      </section>

      {/* Simple by Design Section */}
      <section ref={designRef} className={`py-20 md:py-32 px-5 md:px-10 transition-opacity duration-700 ${designVisible ? 'animate-fade-in opacity-100' : 'opacity-0'}`} style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="max-w-6xl mx-auto">
          {/* Geometric shapes for visual interest */}
          <div className="relative">
            <div className="absolute -top-10 -right-10 w-20 h-20 opacity-20 transform rotate-45 rounded-lg" style={{backgroundColor: 'var(--accent-yellow)'}}></div>
            <h2 className="section-header text-center mb-16" style={{color: 'var(--text-primary)'}}>
              Simple by Design
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="hover-lift p-12 rounded-2xl transition-all duration-300" style={{backgroundColor: 'var(--white)'}}>
              <div className="text-6xl font-black mb-4" style={{color: 'var(--accent-yellow)'}}>01</div>
              <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Learn on the Go</h3>
              <p style={{color: 'var(--text-secondary)'}}>
                5-minute lessons with videos and podcasts for busy schedules.
              </p>
            </div>

            {/* Card 2 */}
            <div className="hover-lift p-12 rounded-2xl transition-all duration-300" style={{backgroundColor: 'var(--white)'}}>
              <div className="text-6xl font-black mb-4" style={{color: 'var(--accent-yellow)'}}>02</div>
              <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Personalized Guidance</h3>
              <p style={{color: 'var(--text-secondary)'}}>
                Chat with an AI mentor to tackle real situations.
              </p>
            </div>

            {/* Card 3 */}
            <div className="hover-lift p-12 rounded-2xl transition-all duration-300" style={{backgroundColor: 'var(--white)'}}>
              <div className="text-6xl font-black mb-4" style={{color: 'var(--accent-yellow)'}}>03</div>
              <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Dive Deep</h3>
              <p style={{color: 'var(--text-secondary)'}}>
                Long-form summaries of the greatest management books.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky CTA for mobile */}
      <div className="fixed bottom-4 left-4 right-4 flex justify-center z-50 lg:hidden">
        <button
          onClick={() => window.location.href = "/learn"}
          className="mobile-cta font-semibold px-8 py-3 rounded-full shadow-lg text-lg hover-lift transition-all duration-300 w-full max-w-sm"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}