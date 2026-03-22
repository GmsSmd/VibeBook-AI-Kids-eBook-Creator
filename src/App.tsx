/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Sparkles, 
  Download, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Image as ImageIcon,
  Type as TypeIcon,
  User,
  Palette
} from 'lucide-react';
import { generateStoryBlueprint, generatePageImage, StoryBlueprint, StoryPage } from './services/gemini';

interface GeneratedPage {
  pageNumber: number;
  text: string;
  imageUrl: string;
}

export default function App() {
  const [topic, setTopic] = useState('Space Exploration');
  const [style, setStyle] = useState('Vintage Golden Books');
  const [author, setAuthor] = useState('');
  const [charDesc, setCharDesc] = useState('');
  
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [blueprint, setBlueprint] = useState<StoryBlueprint | null>(null);
  
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  
  const [currentPageIndex, setCurrentPageIndex] = useState(-1); // -1 for cover, 0-9 for pages, 10 for end
  const [error, setError] = useState<string | null>(null);

  const handleGenerateStory = async () => {
    setIsGeneratingStory(true);
    setError(null);
    try {
      const result = await generateStoryBlueprint(topic, style, author || 'Anonymous', charDesc);
      setBlueprint(result);
      setCurrentPageIndex(-1);
    } catch (err) {
      setError('Failed to generate story. Please try again.');
      console.error(err);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleGenerateBook = async () => {
    if (!blueprint) return;
    setIsGeneratingImages(true);
    setError(null);
    setGeneratedPages([]);
    setCoverImage(null);
    setEndImage(null);

    try {
      // 1. Generate Cover
      const cover = await generatePageImage(
        `Cover illustration for a book titled "${blueprint.title}"`,
        style,
        blueprint.characterDescription,
        '',
        true
      );
      setCoverImage(cover);

      // 2. Generate Pages sequentially to avoid rate limits and ensure consistency
      const pages: GeneratedPage[] = [];
      for (const page of blueprint.pages) {
        const img = await generatePageImage(
          page.illustrationPrompt,
          style,
          blueprint.characterDescription,
          page.text
        );
        pages.push({
          pageNumber: page.pageNumber,
          text: page.text,
          imageUrl: img
        });
        setGeneratedPages([...pages]); // Update UI as they come in
      }

      // 3. Generate End Page
      const end = await generatePageImage(
        "A beautiful closing illustration showing the protagonist waving goodbye or sleeping peacefully.",
        style,
        blueprint.characterDescription,
        'THE END'
      );
      setEndImage(end);
    } catch (err) {
      setError('Failed to generate illustrations. Some pages might be missing.');
      console.error(err);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const totalPages = (blueprint?.pages.length || 0) + 2; // Cover + Pages + End

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-zinc-950 selection:bg-emerald-500/30">
      <header className="w-full max-w-4xl mb-12 text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4"
        >
          <Sparkles className="w-3 h-3" />
          <span>Master Vibe-Coding AI</span>
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight mb-4">
          VibeBook
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Transform your ideas into high-fidelity, vintage-style children's eBooks with cinematic AI illustrations.
        </p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Panel: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-serif font-semibold mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              Book Architecture
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Topic</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Space Exploration"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Style Inspiration</label>
                <div className="relative">
                  <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="e.g. Dr. Seuss meets Vintage Golden Books"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Author Name</label>
                <div className="relative">
                  <TypeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Character Description (Optional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                  <textarea 
                    value={charDesc}
                    onChange={(e) => setCharDesc(e.target.value)}
                    placeholder="Leave blank for AI to decide..."
                    rows={3}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleGenerateStory}
                disabled={isGeneratingStory || !topic}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
              >
                {isGeneratingStory ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Generate Story Blueprint
                  </>
                )}
              </button>
            </div>
          </section>

          {blueprint && (
            <motion.section 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 backdrop-blur-sm"
            >
              <h3 className="text-lg font-serif font-semibold mb-4">Story Confirmed</h3>
              <p className="text-zinc-400 text-sm mb-6 italic">
                "{blueprint.title}" by {blueprint.author}
              </p>
              <button 
                onClick={handleGenerateBook}
                disabled={isGeneratingImages}
                className="w-full bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
              >
                {isGeneratingImages ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Generate Illustrations
                  </>
                )}
              </button>
            </motion.section>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right Panel: Preview */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="relative w-full aspect-[2/3] max-w-md bg-zinc-900 rounded-[2rem] overflow-hidden border border-zinc-800 shadow-2xl shadow-black/50">
            <AnimatePresence mode="wait">
              {currentPageIndex === -1 ? (
                <motion.div 
                  key="cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  {coverImage ? (
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-zinc-800/50">
                      <BookOpen className="w-16 h-16 text-zinc-700 mb-6" />
                      <p className="text-zinc-500 font-serif italic">Cover Page Preview</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8 text-center">
                    <h2 className="text-3xl font-serif font-bold mb-2">{blueprint?.title || "Story Title"}</h2>
                    <p className="text-emerald-400 font-medium tracking-widest uppercase text-xs">By {blueprint?.author || "Author"}</p>
                  </div>
                </motion.div>
              ) : currentPageIndex === 10 ? (
                <motion.div 
                  key="end"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  {endImage ? (
                    <img src={endImage} alt="The End" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-zinc-800/50">
                      <Sparkles className="w-16 h-16 text-zinc-700 mb-6" />
                      <p className="text-zinc-500 font-serif italic">The End Preview</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end justify-center p-12">
                    <h2 className="text-4xl font-serif font-bold mb-8">THE END</h2>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key={`page-${currentPageIndex}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="absolute inset-0 flex flex-col"
                >
                  {generatedPages[currentPageIndex] ? (
                    <img 
                      src={generatedPages[currentPageIndex].imageUrl} 
                      alt={`Page ${currentPageIndex + 1}`} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-zinc-800/50">
                      <ImageIcon className="w-16 h-16 text-zinc-700 mb-6" />
                      <p className="text-zinc-500 font-serif italic">Page {currentPageIndex + 1} Illustration</p>
                      {isGeneratingImages && !generatedPages[currentPageIndex] && (
                        <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating...</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                    <p className="text-lg font-serif leading-relaxed text-center text-zinc-100 italic">
                      {blueprint?.pages[currentPageIndex]?.text || "Rhyming couplet will appear here..."}
                    </p>
                    <div className="mt-4 text-[10px] text-zinc-500 text-center uppercase tracking-[0.2em]">
                      Page {currentPageIndex + 1}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Overlay */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none">
              <button 
                onClick={() => setCurrentPageIndex(prev => Math.max(-1, prev - 1))}
                disabled={currentPageIndex === -1}
                className="w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white backdrop-blur-md pointer-events-auto disabled:opacity-0 transition-opacity"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setCurrentPageIndex(prev => Math.min(10, prev + 1))}
                disabled={currentPageIndex === 10 || (!blueprint)}
                className="w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white backdrop-blur-md pointer-events-auto disabled:opacity-0 transition-opacity"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Progress Dots */}
          <div className="flex gap-1.5 mt-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  currentPageIndex === i - 1 
                    ? 'w-8 bg-emerald-500' 
                    : (i === 0 && coverImage) || (i === 11 && endImage) || (i > 0 && i < 11 && generatedPages[i-1])
                      ? 'w-2 bg-emerald-500/40'
                      : 'w-2 bg-zinc-800'
                }`}
              />
            ))}
          </div>

          {generatedPages.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 flex gap-4"
            >
              <button 
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium transition-colors"
                onClick={() => window.print()}
              >
                <Download className="w-4 h-4" />
                Print to PDF
              </button>
              <button 
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium transition-colors"
                onClick={() => {
                  setBlueprint(null);
                  setGeneratedPages([]);
                  setCoverImage(null);
                  setEndImage(null);
                  setCurrentPageIndex(-1);
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Start Over
              </button>
            </motion.div>
          )}
        </div>
      </main>

      <footer className="mt-20 text-zinc-600 text-xs uppercase tracking-[0.3em] font-medium">
        &copy; 2026 VibeBook AI &bull; Cinematic Storytelling
      </footer>
    </div>
  );
}
