"use client";

import { useState, useEffect } from "react";

interface GeneratedImage {
  url: string;
  prompt: string;
  index: number;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("artistic");
  const [size, setSize] = useState("1024x1024");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [loadingStates, setLoadingStates] = useState([false, false, false, false]);
  const [showApiPopup, setShowApiPopup] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copyingState, setCopyingState] = useState<{[key: number]: boolean}>({});

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setHasGenerated(true);
    setError(null);
    setGeneratedImages([]);
    
    // Reset all loading states to true
    setLoadingStates([true, true, true, true]);
    
    // Generate 4 images
    const imagePromises = Array.from({ length: 4 }, async (_, index) => {
      try {
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            style,
            size,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate image');
        }

        const data = await response.json();
        
        // Update loading state for this specific image
        setLoadingStates(prev => {
          const newStates = [...prev];
          newStates[index] = false;
          return newStates;
        });

        return {
          url: data.imageUrl,
          prompt: prompt,
          index: index
        };
      } catch (error) {
        console.error(`Error generating image ${index}:`, error);
        // Still update loading state even on error
        setLoadingStates(prev => {
          const newStates = [...prev];
          newStates[index] = false;
          return newStates;
        });
        return null;
      }
    });

    try {
      const results = await Promise.all(imagePromises);
      const validResults = results.filter(result => result !== null) as GeneratedImage[];
      setGeneratedImages(validResults);
      
      if (validResults.length === 0) {
        setError("Failed to generate any images. Please try again.");
      }
    } catch (error) {
      console.error('Error in image generation:', error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
      // Ensure all loading states are false
      setLoadingStates([false, false, false, false]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const getImageForIndex = (index: number): GeneratedImage | null => {
    return generatedImages.find(img => img.index === index) || null;
  };

  const handleCopyImage = async (imageUrl: string, index: number) => {
    try {
      setCopyingState(prev => ({ ...prev, [index]: true }));
      
      // Try to copy the image blob first
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
      } else {
        // Fallback: copy the URL
        await navigator.clipboard.writeText(imageUrl);
      }
      
      // Reset after a short delay
      setTimeout(() => {
        setCopyingState(prev => ({ ...prev, [index]: false }));
      }, 2000);
    } catch (error) {
      console.error('Error copying image:', error);
      setCopyingState(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleDownloadImage = async (imageUrl: string, prompt: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate a filename from the prompt
      const filename = prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30);
      
      link.download = `${filename}-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(55,65,81,0.1)_1px,_transparent_0)] bg-[size:20px_20px] pointer-events-none"></div>
      
      {/* Header */}
      <nav className="relative bg-white/80 backdrop-blur-sm border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                AI Image Generator
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <span className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors">
                  Gallery
                </span>
                <span className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors">
                  History
                </span>
                <span className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors">
                  Settings
                </span>
                <button
                  onClick={() => setShowApiPopup(true)}
                  className="text-purple-500 hover:text-purple-700 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors flex items-center space-x-1 group"
                  title="What is an API?"
                >
                  <svg
                    className="w-5 h-5 group-hover:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>What&apos;s an API?</span>
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-sm border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <span className="block px-3 py-2 text-gray-500 hover:text-gray-700 font-medium cursor-pointer">
                Gallery
              </span>
              <span className="block px-3 py-2 text-gray-500 hover:text-gray-700 font-medium cursor-pointer">
                History
              </span>
              <span className="block px-3 py-2 text-gray-500 hover:text-gray-700 font-medium cursor-pointer">
                Settings
              </span>
              <button
                onClick={() => {
                  setShowApiPopup(true);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-purple-500 hover:text-purple-700 font-medium"
              >
                What&apos;s an API?
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* API Explanation Popup */}
      {showApiPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">What is an API?</h2>
              </div>
              <button
                onClick={() => setShowApiPopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Simple Definition */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">🤝 Simple Definition</h3>
                <p className="text-blue-800 text-sm sm:text-lg leading-relaxed">
                  An <strong>API</strong> (Application Programming Interface) is like a <strong>waiter at a restaurant</strong> 
                  - it takes your order, brings it to the kitchen, and delivers your food back to you.
                </p>
              </div>

              {/* Restaurant Analogy */}
              <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                  🍽️ The Restaurant Analogy
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl mb-2">👤</div>
                    <h4 className="font-semibold text-green-900">You (Customer)</h4>
                    <p className="text-green-800 text-sm">Want something specific from the menu</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-2xl mb-2">🍽️</div>
                    <h4 className="font-semibold text-blue-900">API (Waiter)</h4>
                    <p className="text-blue-800 text-sm">Takes your order and communicates with the kitchen</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-2xl mb-2">👩‍🍳</div>
                    <h4 className="font-semibold text-purple-900">Kitchen (Server)</h4>
                    <p className="text-purple-800 text-sm">Prepares your order and sends it back</p>
                  </div>
                </div>
              </div>

              {/* More Analogies */}
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">🔗 More Ways to Think About It</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-xl">🔌</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">Power Outlet</h4>
                      <p className="text-gray-700 text-sm">You don&apos;t need to know how electricity works - just plug in and get power!</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-xl">🗣️</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">Translator</h4>
                      <p className="text-gray-700 text-sm">Helps different systems &ldquo;talk&rdquo; to each other in a common language</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-xl">📬</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">Mail Service</h4>
                      <p className="text-gray-700 text-sm">Delivers messages and packages between different addresses</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How It Works */}
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">⚙️ How It Works (Step by Step)</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg">
                    <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <p className="text-indigo-900 text-sm"><strong>Request:</strong> Your app asks the API for something</p>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg">
                    <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <p className="text-indigo-900 text-sm"><strong>Process:</strong> The API talks to the right service</p>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg">
                    <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <p className="text-indigo-900 text-sm"><strong>Response:</strong> The API brings back what you asked for</p>
                  </div>
                </div>
              </div>

              {/* Real Examples */}
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">🌟 Real-World Examples</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-1">Weather Apps</h4>
                    <p className="text-yellow-800 text-sm">Get live weather data from weather services</p>
                  </div>
                  
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                    <h4 className="font-semibold text-pink-900 mb-1">Social Media</h4>
                    <p className="text-pink-800 text-sm">Post photos, get your timeline, send messages</p>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-1">Payment Apps</h4>
                    <p className="text-green-800 text-sm">Process credit card payments securely</p>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-1">This App!</h4>
                    <p className="text-purple-800 text-sm">Sends your text to AI and gets back images</p>
                  </div>
                </div>
              </div>

              {/* Key Takeaway */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-semibold text-emerald-900 mb-2">💡 Key Takeaway</h3>
                <p className="text-emerald-800 text-sm sm:text-base leading-relaxed">
                  APIs make it possible for different apps and services to work together seamlessly. 
                  They&apos;re like universal translators that help the digital world communicate!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Title */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            AI Image Generator
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your ideas into stunning visuals with the power of artificial intelligence
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 sm:mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm sm:text-base">{error}</p>
            </div>
          </div>
        )}

        {/* Input Section - Subtle Purple Gradient */}
        <div className="mb-8 sm:mb-12">
          <div className="bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-100 border border-purple-200/50 rounded-2xl p-4 sm:p-8 shadow-lg">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="prompt" className="block text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
                  Describe your image
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="A futuristic cityscape at sunset with flying cars and neon lights..."
                  className="w-full h-24 sm:h-32 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-purple-200 shadow-md focus:ring-3 focus:ring-purple-300/50 focus:border-purple-400 focus:outline-none resize-none text-gray-900 placeholder-gray-500 text-sm sm:text-lg bg-white/70 backdrop-blur-sm"
                  disabled={isGenerating}
                />
                <p className="text-xs sm:text-sm text-gray-600 mt-2">Press Enter to generate images</p>
              </div>
              
              {/* Form Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <select 
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="bg-white/80 backdrop-blur-sm text-gray-700 border border-purple-200 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300/50 shadow-sm text-sm sm:text-base"
                    disabled={isGenerating}
                  >
                    <option value="1024x1024">Square (1024×1024)</option>
                    <option value="1024x768">Landscape (1024×768)</option>
                    <option value="768x1024">Portrait (768×1024)</option>
                  </select>
                  <select 
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="bg-white/80 backdrop-blur-sm text-gray-700 border border-purple-200 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300/50 shadow-sm text-sm sm:text-base"
                    disabled={isGenerating}
                  >
                    <option value="artistic">Artistic</option>
                    <option value="photorealistic">Photorealistic</option>
                    <option value="anime">Anime</option>
                    <option value="digital-art">Digital Art</option>
                  </select>
                </div>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-6 sm:px-8 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Generating...</span>
                    </div>
                  ) : (
                    'Generate Images'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Generated Images Grid - Responsive */}
        {hasGenerated && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-fade-in">
            {[0, 1, 2, 3].map((index) => {
              const image = getImageForIndex(index);
              const isLoading = loadingStates[index];
              
              return (
                <div
                  key={index}
                  className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 shadow-lg relative group"
                >
                  {isLoading ? (
                    // Loading State
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
                      <div className="relative">
                        {/* Blurred placeholder content */}
                        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg bg-gradient-to-br from-purple-200 to-indigo-200 blur-sm opacity-60 animate-pulse"></div>
                        
                        {/* Loading spinner overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-2 sm:border-3 border-purple-300 border-t-purple-600"></div>
                        </div>
                      </div>
                      <p className="text-purple-600 font-medium mt-3 sm:mt-4 animate-pulse text-sm sm:text-base">Generating...</p>
                      <div className="flex space-x-1 mt-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                    </div>
                  ) : image ? (
                    // Generated Image State
                    <div className="relative w-full h-full group cursor-pointer">
                      <img
                        src={image.url}
                        alt={`Generated image: ${image.prompt}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Action Icons Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="flex space-x-3 sm:space-x-4">
                          {/* Copy Icon */}
                          <button
                            onClick={() => handleCopyImage(image.url, index)}
                            className="bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 p-2 sm:p-3 rounded-full transition-all duration-200 hover:scale-110 shadow-lg group/copy"
                            title="Copy image to clipboard"
                          >
                            {copyingState[index] ? (
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                          
                          {/* Download Icon */}
                          <button
                            onClick={() => handleDownloadImage(image.url, image.prompt, index)}
                            className="bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 p-2 sm:p-3 rounded-full transition-all duration-200 hover:scale-110 shadow-lg group/download"
                            title="Download image"
                          >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Error State
                    <div className="flex flex-col items-center justify-center h-full space-y-3 text-gray-500">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-sm sm:text-base">Failed to generate</span>
                      <span className="text-xs sm:text-sm">Try again</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!hasGenerated && (
          <div className="text-center py-12 sm:py-16">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 sm:w-12 sm:h-12 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Ready to create something amazing?</h3>
            <p className="text-sm sm:text-base text-gray-500">Enter a description above and press Enter to generate your first set of images.</p>
          </div>
        )}

        {/* Additional Options */}
        <div className="mt-8 sm:mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 bg-white rounded-full px-4 sm:px-8 py-3 sm:py-4 shadow-lg border border-gray-200">
            <span className="text-gray-600 font-medium text-sm sm:text-base">Need inspiration?</span>
            <div className="flex items-center space-x-4 sm:space-x-6">
              <button className="text-purple-600 hover:text-purple-700 font-semibold underline text-sm sm:text-base">
                Browse Examples
              </button>
              <span className="text-gray-300 hidden sm:block">|</span>
              <button className="text-purple-600 hover:text-purple-700 font-semibold underline text-sm sm:text-base">
                Random Prompt
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
