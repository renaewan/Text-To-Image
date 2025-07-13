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

        // Add the generated image
        setGeneratedImages(prev => [...prev, {
          url: data.imageUrl,
          prompt: data.prompt,
          index
        }]);

        return data;
      } catch (error) {
        console.error(`Error generating image ${index + 1}:`, error);
        setLoadingStates(prev => {
          const newStates = [...prev];
          newStates[index] = false;
          return newStates;
        });
        throw error;
      }
    });

    try {
      await Promise.all(imagePromises);
    } catch (error) {
      setError('Some images failed to generate. Please try again.');
    } finally {
      setIsGenerating(false);
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
      
      // Fetch the image as a blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      // Reset copying state after a brief delay
      setTimeout(() => {
        setCopyingState(prev => ({ ...prev, [index]: false }));
      }, 1000);
      
    } catch (error) {
      console.error('Failed to copy image:', error);
      setCopyingState(prev => ({ ...prev, [index]: false }));
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(imageUrl);
      } catch (urlError) {
        console.error('Failed to copy URL:', urlError);
      }
    }
  };

  const handleDownloadImage = async (imageUrl: string, prompt: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename from prompt (first 50 chars) + timestamp
      const cleanPrompt = prompt.substring(0, 50).replace(/[^a-z0-9]/gi, '_');
      const timestamp = new Date().getTime();
      link.download = `ai_image_${cleanPrompt}_${timestamp}.jpg`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Top Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Home
              </h1>
            </div>
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
                {/* API Info Icon */}
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
                  <span>What's an API?</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* API Explanation Popup */}
      {showApiPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">What is an API?</h2>
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
            <div className="p-6 space-y-6">
              {/* Simple Definition */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">🤝 Simple Definition</h3>
                <p className="text-blue-800 text-lg leading-relaxed">
                  An <strong>API</strong> (Application Programming Interface) is like a <strong>waiter at a restaurant</strong> 
                  - it takes your order, brings it to the kitchen, and delivers your food back to you.
                </p>
              </div>

              {/* Restaurant Analogy */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  🍽️ The Restaurant Analogy
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl mb-2">👤</div>
                    <h4 className="font-semibold text-green-900 mb-1">You (The Customer)</h4>
                    <p className="text-green-800 text-sm">Your app or website that wants something</p>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-2xl mb-2">🙋‍♂️</div>
                    <h4 className="font-semibold text-yellow-900 mb-1">API (The Waiter)</h4>
                    <p className="text-yellow-800 text-sm">Takes your request and delivers the response</p>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-2xl mb-2">👨‍🍳</div>
                    <h4 className="font-semibold text-purple-900 mb-1">Server (The Kitchen)</h4>
                    <p className="text-purple-800 text-sm">Processes your request and creates the response</p>
                  </div>
                </div>
              </div>

              {/* How It Works */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  ⚙️ How APIs Work
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <p className="font-medium text-gray-900">You make a request</p>
                      <p className="text-gray-600 text-sm">"Hey API, can you generate an image of a sunset?"</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <p className="font-medium text-gray-900">API processes your request</p>
                      <p className="text-gray-600 text-sm">The API understands what you want and forwards it to the right service</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <p className="font-medium text-gray-900">API sends back the result</p>
                      <p className="text-gray-600 text-sm">"Here's your beautiful sunset image!"</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* More Analogies */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">🌟 More Ways to Think About APIs</h3>
                
                <div className="grid gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xl">🔌</span>
                      <h4 className="font-semibold text-gray-900">Like a Power Outlet</h4>
                    </div>
                    <p className="text-gray-700 text-sm">You don't need to know how electricity works - just plug in and get power!</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xl">🌐</span>
                      <h4 className="font-semibold text-gray-900">Like a Translator</h4>
                    </div>
                    <p className="text-gray-700 text-sm">APIs translate between different systems so they can understand each other</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xl">📬</span>
                      <h4 className="font-semibold text-gray-900">Like a Mail Service</h4>
                    </div>
                    <p className="text-gray-700 text-sm">You give a letter (request) to the mailman (API), and they deliver it and bring back a reply</p>
                  </div>
                </div>
              </div>

              {/* Why APIs Matter */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                  <span className="mr-2">💡</span>
                  Why APIs Are Amazing
                </h3>
                <ul className="space-y-2 text-green-800">
                  <li className="flex items-start">
                    <span className="mr-2 mt-1">•</span>
                    <span><strong>No Reinventing:</strong> Use existing services instead of building everything from scratch</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-1">•</span>
                    <span><strong>Super Powers:</strong> Add AI, maps, payments, and more to your apps easily</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-1">•</span>
                    <span><strong>Time Saver:</strong> Focus on your idea, not building basic infrastructure</span>
                  </li>
                </ul>
              </div>

              {/* Real Example */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">🎨 This App Example</h3>
                <p className="text-purple-800">
                  This image generator uses an API! When you type a description and hit generate, 
                  it sends your text to an AI service through an API, and gets back amazing images. 
                  You don't need to know how AI works - the API handles all the complex stuff!
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowApiPopup(false)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
              >
                Got it! Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            AI Image Generator
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your imagination into stunning visuals. Describe your vision and watch it come to life.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Input Section - Subtle Purple Gradient */}
        <div className="mb-12">
          <div className="bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-100 border border-purple-200/50 rounded-2xl p-8 shadow-lg">
            <div className="space-y-6">
              <div>
                <label htmlFor="prompt" className="block text-xl font-semibold text-gray-800 mb-4">
                  Describe your image
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="A futuristic cityscape at sunset with flying cars and neon lights..."
                  className="w-full h-32 px-4 py-3 rounded-lg border border-purple-200 shadow-md focus:ring-3 focus:ring-purple-300/50 focus:border-purple-400 focus:outline-none resize-none text-gray-900 placeholder-gray-500 text-lg bg-white/70 backdrop-blur-sm"
                  disabled={isGenerating}
                />
                <p className="text-sm text-gray-600 mt-2">Press Enter to generate images</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <select 
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="bg-white/80 backdrop-blur-sm text-gray-700 border border-purple-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300/50 shadow-sm"
                    disabled={isGenerating}
                  >
                    <option value="1024x1024">Square (1024×1024)</option>
                    <option value="1024x768">Landscape (1024×768)</option>
                    <option value="768x1024">Portrait (768×1024)</option>
                  </select>
                  <select 
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="bg-white/80 backdrop-blur-sm text-gray-700 border border-purple-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300/50 shadow-sm"
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
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-8 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isGenerating ? (
                    <div className="flex items-center space-x-2">
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

        {/* Generated Images Grid - 2x2 */}
        {hasGenerated && (
          <div className="grid grid-cols-2 gap-6 animate-fade-in">
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
                        <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-purple-200 to-indigo-200 blur-sm opacity-60 animate-pulse"></div>
                        
                        {/* Loading spinner overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-3 border-purple-300 border-t-purple-600"></div>
                        </div>
                      </div>
                      <p className="text-purple-600 font-medium mt-4 animate-pulse">Generating...</p>
                      <div className="flex space-x-1 mt-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
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
                        <div className="flex space-x-4">
                          {/* Copy Icon */}
                          <button
                            onClick={() => handleCopyImage(image.url, index)}
                            className="bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 p-3 rounded-full transition-all duration-200 hover:scale-110 shadow-lg group/copy"
                            title="Copy image to clipboard"
                          >
                            {copyingState[index] ? (
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                          
                          {/* Download Icon */}
                          <button
                            onClick={() => handleDownloadImage(image.url, image.prompt, index)}
                            className="bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 p-3 rounded-full transition-all duration-200 hover:scale-110 shadow-lg group/download"
                            title="Download image"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Error State
                    <div className="flex flex-col items-center justify-center h-full space-y-3 text-gray-500">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Failed to generate</span>
                      <span className="text-sm">Try again</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!hasGenerated && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-purple-400"
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
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to create something amazing?</h3>
            <p className="text-gray-500">Enter a description above and press Enter to generate your first set of images.</p>
          </div>
        )}

        {/* Additional Options */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-6 bg-white rounded-full px-8 py-4 shadow-lg border border-gray-200">
            <span className="text-gray-600 font-medium">Need inspiration?</span>
            <button className="text-purple-600 hover:text-purple-700 font-semibold underline">
              Browse Examples
            </button>
            <span className="text-gray-300">|</span>
            <button className="text-purple-600 hover:text-purple-700 font-semibold underline">
              Random Prompt
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
